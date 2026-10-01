import test from 'node:test';
import assert from 'node:assert/strict';
import {birthdayProfile,canRead,restoreProfile,readingAge,personQuestionIssue} from '../src/profile.ts';
import {forecastDueDate} from '../src/due-date.ts';
import {validateAnswer} from '../src/questions.ts';
import {handler} from '../server/handler.ts';
import {makePlan,predict} from '../server/engine.ts';
import {provider} from '../server/provider.ts';
import type {AccountState} from '../src/types.ts';
const blank=():AccountState=>({sunSign:null,ageBand:null,facts:{},history:[],credits:3,plus:true,usage:{day:'2026-10-01',count:0},reduceMotion:true,largeText:false,ambientSound:true,ballStyle:'gold'});

test('Skip needs confirmation; confirmation persists teen-safe eligibility and decline stays blocked',()=>{
 const skipped={...blank(),...birthdayProfile(),onboardingDone:true};assert.equal(canRead(skipped),false);
 const confirmed={...skipped,...birthdayProfile(undefined,true)};
 assert.equal(canRead(confirmed),true);assert.equal(confirmed.ageBand,'teen');assert.equal(confirmed.sunSign,null);assert.equal(confirmed.birthday,undefined);
 const reload=restoreProfile(JSON.parse(JSON.stringify(confirmed)));
 assert.equal(canRead(reload),true);assert.equal(reload.ageBand,'teen');assert.equal(reload.credits,3);assert.equal(reload.ballStyle,'gold');assert.equal(reload.ambientSound,true);
 const declined=restoreProfile({...confirmed,onboardingBlocked:true,onboardingDone:false,ageConfirmed:false});
 assert.equal(canRead(declined),false);assert.equal(canRead(restoreProfile(JSON.parse(JSON.stringify(declined)))),false);
 assert.equal(canRead({...confirmed,...birthdayProfile()}),false);
});

test('legacy history, facts, ageBand and friend entry cannot confer age or mirror eligibility',()=>{
 for(const legacy of [{}, {onboardingDone:true,ageBand:'adult' as const,sunSign:'aries'}, {facts:{birthday:'not a date',level:'Intermediate'}}]){
  const restored=restoreProfile({...blank(),...legacy});assert.equal(canRead(restored),false);assert.equal(restored.onboardingDone,false);assert.equal(restored.sunSign,null);
 }
 const adult=restoreProfile({...blank(),facts:{birthday:'1990-01-01',level:'Intermediate'}});assert.equal(canRead(adult),true);assert.equal(adult.facts.birthday,undefined);
 const child=restoreProfile({...blank(),birthday:'2020-01-01',ageConfirmed:true,onboardingDone:true});assert.equal(canRead(child),false);assert.equal(child.onboardingBlocked,true);
 const friendEntry={...blank(),...birthdayProfile(undefined,true),onboardingDone:true};
 assert.equal(canRead(friendEntry),true);assert.equal(canRead({...friendEntry,history:[{id:'first-reading'} as AccountState['history'][number]]}),true);
 assert.throws(()=>readingAge('2020-01-01',true),/13/);
});

test('API requires age confirmation on both actions, including friend links, before model access',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_url,init)=>{
  calls++;const body=JSON.parse(String(init?.body));
  const content=body.format.properties.cards?{cards:[{question:'How often do you write?',options:['Daily','Weekly','Rarely']}]}:body.format.properties.prediction?{prediction:'You will finish.',basis:'context_1',assumption:'Your regular writing continues.'}:{category:'allow'};
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 const call=handler(()=>undefined);
 try{
  for(const action of ['plan','predict'])for(const friend of [false,true]){
   const base={action,friend,question:'Will I finish my draft in six months?',facts:{context_1:'Daily writing',horizon:'in 6 months'}};
   for(const age of [{},{ageConfirmed:false},{ageConfirmed:'true'},{viewerBirthday:'2020-01-01',ageConfirmed:true}]){
    const before:number=calls;
    const response=await call(new Request('http://localhost',{method:'POST',body:JSON.stringify({...base,...age})}));assert.equal(response.status,400);assert.equal(calls,before);
   }
   for(const age of [{ageConfirmed:true},{viewerBirthday:'1990-01-01'}]){
    const response=await call(new Request('http://localhost',{method:'POST',body:JSON.stringify({...base,...age})}));assert.equal(response.status,200);assert.equal((await response.json()).kind,'ok');
   }
  }
 }finally{globalThis.fetch=original;}
});

test('fractional horizons fail across cards and forecast branches without truncation',async()=>{
 const now=new Date('2026-10-01T00:00:00Z');
 assert.throws(()=>validateAnswer('growth','growth_weeks','1.5'),/whole/);
 assert.equal(forecastDueDate('in 1 day',now),'2026-10-02');assert.equal(forecastDueDate('in 2 weeks',now),'2026-10-15');
 const original=globalThis.fetch;let outcomes=0;
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));if(body.format.properties.prediction)outcomes++;return new Response(JSON.stringify({message:{content:'{"category":"allow"}'}}));};
 try{
  for(const unit of ['days','weeks','months','years']){
   const horizon=`in 1.5 ${unit}`;assert.throws(()=>forecastDueDate(horizon,now),/whole/);
   for(const id of ['horizon','deadline'])assert.throws(()=>validateAnswer('general',id,horizon),/whole/);
   for(const [question,facts] of [
    ['Will I finish?',{context_1:'Daily effort',horizon}],
    ['Will I learn Spanish?',{level:'Intermediate',practice:'20 minutes',conversation:'Weekly',deadline:horizon}],
   ] as const)assert.equal((await predict(question,facts,false,provider(()=>undefined))).kind,'error');
  }
  assert.equal((await predict('How many users will my project have?',{current_users:'10',weekly_growth:'2',growth_weeks:'1.5'},false,provider(()=>undefined))).kind,'error');
  assert.equal(outcomes,0);
 }finally{globalThis.fetch=original;}
});

test('Person mismatch asks for clarification before planning or forecasting',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('No model call expected');};
 try{
  for(const question of ['Will Jordan learn Spanish?','Will Alexis learn Spanish?','Will they learn Spanish?']){
   assert.match(personQuestionIssue(question,'Alex')!,/Include Alex/);
   const plan=await makePlan(question,{},provider(()=>undefined),{personName:'Alex'});
   const forecast=await predict(question,{context_1:'Daily practice',horizon:'in 3 months'},false,provider(()=>undefined),{personName:'Alex'});
   for(const result of [plan,forecast]){assert.equal(result.kind,'error');if(result.kind==='error')assert.match(result.message,/Include Alex/);}
  }
  for(const [name,question] of [['Alex','Will Alex learn Spanish?'],['Alex',"Will Alex’s practice help?"],['Élodie','Will Élodie and I practice?'],['Jo-Anne','Will Jo-Anne learn?']])assert.equal(personQuestionIssue(question,name),undefined);
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
