import test from 'node:test';
import assert from 'node:assert/strict';
import {loveHorizons,makePlan,predict} from '../server/engine.ts';
import {handler} from '../server/handler.ts';
import {forecastDueDate} from '../src/due-date.ts';
import type {ModelProvider} from '../server/provider.ts';

// Answers each engine call by its schema, the way a structured-output model does.
function scripted(horizon:string|undefined,seen:Record<string,unknown>[]=[]):ModelProvider{
 return {async json<T>(_system:string,_input:unknown,schema:{properties?:Record<string,unknown>},valid:(x:unknown)=>unknown){
  const properties=schema.properties??{};seen.push(properties);
  const value='category'in properties?{category:'allow'}:'fits'in properties?{reason:'Each option answers it.',fits:true}:'cards'in properties?{cards:[{factor:'social life',question:'How often do you meet new people?',options:['Weekly','Monthly','Rarely']}]}:{insight:'You meet people through routines you already keep, so a familiar place carries the next spark.',basis:'context_1',prediction:'You will share a first coffee with someone new.',...(horizon?{horizon}:{})};
  const verdict=await valid(value);
  if(verdict!==true)throw new Error(`Rejected: ${JSON.stringify(verdict)}`);
  return value as T;
 }};
}

test('a love timing plan never asks how far ahead to look, even for a question that names a time',async()=>{
 for(const question of ['When will I meet someone special?','Will I find love this year?','Will I meet someone if I move to Lisbon?']){
  const plan=await makePlan(question,{},scripted(undefined),{timing:'love',viewerBirthday:'1995-06-15'});
  assert.equal(plan.kind,'ok');if(plan.kind!=='ok')continue;
  assert.equal(plan.value.topic,'general');
  assert.ok(!plan.value.cards.some(c=>c.id==='horizon'));
  assert.equal(plan.value.provided.horizon,undefined);
 }
 const plain=await makePlan('When will I meet someone special?',{},scripted(undefined),{viewerBirthday:'1995-06-15'});
 assert.ok(plain.kind==='ok'&&plain.value.cards.some(c=>c.id==='horizon'));
});

test('the Ball picks the love timing date and the check-in falls on it',async()=>{
 const seen:Record<string,unknown>[]=[];
 const result=await predict('When will I meet someone special?',{context_1:'How often do you meet new people? Weekly'},false,scripted('in 6 months',seen),{timing:'love',viewerBirthday:'1995-06-15',localDate:'2026-10-14'});
 assert.equal(result.kind,'ok');if(result.kind!=='ok')return;
 assert.deepEqual(seen.find(p=>'prediction'in p)?.horizon,{type:'string',enum:loveHorizons});
 assert.equal(result.value.timing,'love');
 assert.equal(result.value.label,'Love timing');
 assert.equal(result.value.dueDate,forecastDueDate('in 6 months','2026-10-14'));
 assert.equal(result.value.dueDate,'2027-04-14');
 assert.equal(result.value.facts.horizon,'in 6 months');
 assert.equal(result.value.headline,'You will share a first coffee with someone new in 6 months.');
});

test('a love timing forecast without an allowed date is rejected, and other readings stay unchanged',async()=>{
 const facts={context_1:'How often do you meet new people? Weekly'};
 for(const horizon of [undefined,'in 10 years']){
  const result=await predict('When will I meet someone special?',facts,false,scripted(horizon),{timing:'love',viewerBirthday:'1995-06-15',localDate:'2026-10-14'});
  assert.equal(result.kind,'error');
 }
 const seen:Record<string,unknown>[]=[];
 const plain=await predict('When will I meet someone special?',{...facts,horizon:'Within 3 months'},false,scripted(undefined,seen),{viewerBirthday:'1995-06-15',localDate:'2026-10-14'});
 assert.equal(plain.kind,'ok');if(plain.kind!=='ok')return;
 assert.equal(plain.value.timing,undefined);assert.equal(plain.value.label,'Your prediction');
 assert.ok(!('horizon'in(seen.find(p=>'prediction'in p)??{})));
});

test('the API accepts only the love timing reading kind',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('Unexpected model access');};
 try{
  const response=await handler(()=>undefined)(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'plan',question:'When will I meet someone special?',facts:{},timing:'fame',viewerBirthday:'1995-06-15'})}));
  assert.equal(response.status,400);assert.equal((await response.json()).message,'Please choose a reading.');
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
