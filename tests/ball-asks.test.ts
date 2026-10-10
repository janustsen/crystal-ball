import test from 'node:test';
import assert from 'node:assert/strict';
import {answerAsk,asks,asksOf,bonusDue,deckFor,insightDue,maxAskBonuses,nextAsk,selfContext,selfKey,skipAsk,validSelf} from '../src/ball-asks.ts';
import {phraseSafety} from '../src/safety-policy.ts';
import {predict} from '../server/engine.ts';
import {handler} from '../server/handler.ts';
import {requestOmen} from '../src/api.ts';
import type {ModelProvider,Validator} from '../server/provider.ts';
import type {AccountState} from '../src/types.ts';

const account=(facts:Record<string,string>={}):AccountState=>({sunSign:null,ageBand:'adult',facts,history:[],credits:0,plus:false,usage:{day:'2026-10-09',count:0},reduceMotion:false,largeText:false});

test('the question bank is one-tap, distinct and free of sensitive topics, with separate teen and adult decks',()=>{
 assert.equal(new Set(asks.map(ask=>ask.id)).size,asks.length);
 assert.ok(asks.length>=120);
 for(const ask of asks){
  assert.ok(ask.options.length>=2&&ask.options.length<=4,ask.id);
  assert.equal(new Set(ask.options).size,ask.options.length,ask.id);
  assert.ok(ask.question.length<=80&&ask.options.every(option=>option.length<=32),ask.id);
  assert.equal(phraseSafety([ask.question,...ask.options].join(' ')),undefined,ask.id);
  assert.doesNotMatch([ask.question,...ask.options].join(' '),/\b(sex\w*|religio\w*|god|church|politic\w*|vote|diet|weight|body|sick|illness|parents?|mom|dad)\b/i,ask.id);
 }
 const teen=deckFor(true),adult=deckFor(false);
 assert.ok(teen.every(ask=>ask.only!=='adult')&&teen.some(ask=>ask.only==='teen'));
 assert.ok(adult.every(ask=>ask.only!=='teen')&&adult.some(ask=>ask.only==='adult'));
 assert.ok(['date_idea','romance_pace','extra_money','money_talk'].every(id=>!teen.some(ask=>ask.id===id)));
 // Consecutive cards come from different life areas.
 assert.ok(asks.slice(0,7).every((ask,i,list)=>i===0||ask.area!==list[i-1].area));
 assert.equal(maxAskBonuses,Math.floor(Math.max(teen.length,adult.length)/25));
});

test('answering records a validated self fact and counts each question once; skipped cards come back last',()=>{
 let state=account();
 const first=nextAsk(state,false)!;
 assert.equal(answerAsk(state,first.id,'Not an option'),state);
 state=answerAsk(state,first.id,first.options[0]);
 assert.equal(state.facts[selfKey(first.id)],first.options[0]);
 state=answerAsk(state,first.id,first.options[1]);
 assert.equal(state.facts[selfKey(first.id)],first.options[1]);
 assert.deepEqual(asksOf(state).seen,[first.id]);
 const second=nextAsk(state,false)!;
 state=skipAsk(state,second.id);
 assert.notEqual(nextAsk(state,false)!.id,second.id);
 for(let ask=nextAsk(state,false);ask&&ask.id!==second.id;ask=nextAsk(state,false))state=answerAsk(state,ask.id,ask.options[0]);
 assert.equal(nextAsk(state,false)?.id,second.id);
 state=answerAsk(state,second.id,second.options[0]);
 assert.equal(nextAsk(state,false),undefined);
 assert.equal(asksOf(state).seen.length,deckFor(false).length);
});

test('an insight is due every 10 answers and a bonus reading every 25, never twice',()=>{
 const progress=(seen:number,insights=0,bonus=0)=>({seen:asks.slice(0,seen).map(ask=>ask.id),skipped:[],insights:Array.from({length:insights},()=>({kind:'portrait' as const,title:'T',text:'x',at:''})),bonus});
 assert.equal(insightDue(progress(9)),false);
 assert.equal(insightDue(progress(10)),true);
 assert.equal(insightDue(progress(19,1)),false);
 assert.equal(insightDue(progress(20,1)),true);
 assert.equal(bonusDue(progress(24)),0);
 assert.equal(bonusDue(progress(25)),1);
 assert.equal(bonusDue(progress(50,0,1)),1);
 // After Forget everything, progress restarts but granted bonuses stay counted.
 assert.equal(bonusDue(progress(30,0,2)),0);
});

test('only valid, theme-relevant self answers join a forecast, at most six, teen-safe',()=>{
 const facts:Record<string,string>={self_sunrise_3am:'3 a.m.',self_routines:'Grounding',self_colors:'Bright',self_season:'Not an option',self_bogus:'Yes',self_date_idea:'A cozy night in',current_focus:'Rest'};
 assert.deepEqual(selfContext('Will I build a better routine?',facts),{self_routines:'Grounding',self_sunrise_3am:'3 a.m.'});
 assert.deepEqual(selfContext('Will I find love this year?',facts,false),{self_date_idea:'A cozy night in'});
 assert.deepEqual(selfContext('Will I find love this year?',facts,true),{});
 assert.equal(validSelf('self_date_idea','A cozy night in',true),false);
 const many=Object.fromEntries(deckFor(false).filter(ask=>ask.area==='energy').map(ask=>[selfKey(ask.id),ask.options[0]]));
 assert.equal(Object.keys(selfContext('Will I build a better routine?',many)).length,6);
});

function forecaster(shapedBy:string,seen:unknown[]):ModelProvider {
 return {async json<T>(_system:string,input:unknown,schema:{properties?:Record<string,unknown>},valid:Validator){
  const fields=schema.properties??{};
  const value='category'in fields?{category:'allow'}:{prediction:'You will find a steadier rhythm',basis:'context_1',assumption:'Your evenings keep the calm shape you described.',...('shapedBy'in fields?{shapedBy}:{})};
  if('prediction'in fields)seen.push(input);
  const verdict=await valid(value);
  if(verdict!==true&&!(typeof verdict==='object'&&verdict.valid))throw new Error(`invalid ${JSON.stringify(verdict)}`);
  return value as T;
 }} as ModelProvider;
}

test('the forecaster reads self answers with their questions and the reveal names the one that shaped it',async()=>{
 const facts={context_1:'How steady is your routine? Mostly steady',horizon:'Within 3 months',self_sunrise_3am:'3 a.m.',self_colors:'Bright',self_season:'Not an option',self_bogus:'x'};
 const seen:any[]=[];
 const shaped=await predict('Will I build a better routine?',facts,false,forecaster('self_sunrise_3am',seen),{viewerBirthday:'1990-05-01'});
 assert.equal(shaped.kind,'ok');
 if(shaped.kind!=='ok')return;
 assert.deepEqual(shaped.value.shapedBy,{question:'Sunrise or 3 a.m.?',answer:'3 a.m.'});
 assert.equal(seen[0].facts.self_sunrise_3am,'Sunrise or 3 a.m.? 3 a.m.');
 assert.ok(!['self_colors','self_season','self_bogus'].some(key=>key in seen[0].facts));
 const unshaped=await predict('Will I build a better routine?',facts,false,forecaster('none',[]),{viewerBirthday:'1990-05-01'});
 assert.equal(unshaped.kind==='ok'&&unshaped.value.shapedBy,undefined);
 // A question about the world carries no personal context at all.
 const world:any[]=[];
 await predict('Will the city build a better park?',facts,false,forecaster('none',world),{viewerBirthday:'1990-05-01'});
 assert.ok(!Object.keys(world[0].facts).some(key=>key.startsWith('self_')));
});

test('the insight action reads only valid answers, needs a few, and returns a gentle title and text',async()=>{
 let input:any;
 const model={async json<T>(_system:string,value:unknown,_schema:unknown,valid:Validator){
  input=value;
  assert.notEqual(await valid({title:'The Certain One',text:'You will definitely succeed at everything you try, guaranteed, because your answers prove it beyond any doubt at all.'}),true);
  const insight={title:'The Midnight Planner',text:'You come alive after dark and like a steady shape to your days, so a small late-evening creative ritual could suit you well.'};
  assert.equal(await valid(insight),true);
  return insight as T;
 }} as ModelProvider;
 const serve=handler(()=>undefined,model);
 const ask=(body:object)=>serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'insight',question:'The Ball asks insight',ageConfirmed:true,...body})}));
 const facts={self_sunrise_3am:'3 a.m.',self_routines:'Grounding',self_colors:'Bright',self_season:'Not an option',self_bogus:'x'};
 const ok=await ask({insightKind:'portrait',facts});
 assert.equal(ok.status,200);
 assert.deepEqual((await ok.json()).value,{title:'The Midnight Planner',text:'You come alive after dark and like a steady shape to your days, so a small late-evening creative ritual could suit you well.'});
 assert.deepEqual(input,{kind:'portrait',answers:[{question:'Sunrise or 3 a.m.?',answer:'3 a.m.'},{question:'Routines feel…',answer:'Grounding'},{question:'Your colors are…',answer:'Bright'}]});
 assert.equal((await ask({insightKind:'fortune',facts})).status,400);
 assert.equal((await ask({insightKind:'portrait',facts:{self_sunrise_3am:'3 a.m.',self_routines:'Grounding'}})).status,400);
});

test('the daily omen never carries self answers, so a long deck cannot break the engine limit',async()=>{
 const original=globalThis.fetch;let sent:any;
 globalThis.fetch=async(_url,init)=>{sent=JSON.parse(String(init?.body));return Response.json({kind:'ok',value:{text:'A calm star lights a patient path today.'}})};
 try{
  const facts=Object.fromEntries([...asks.slice(0,40).map(ask=>[selfKey(ask.id),ask.options[0]]),['current_focus','Rest']]);
  await requestOmen(facts,{sunSign:null,birthday:undefined,ageConfirmed:true});
  assert.deepEqual(sent.facts,{current_focus:'Rest'});
 }finally{globalThis.fetch=original}
});
