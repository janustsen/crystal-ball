import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlan,predict} from '../server/engine.ts';
import {provider} from '../server/provider.ts';
import {handler} from '../server/handler.ts';
import {personQuestionIssue} from '../src/profile.ts';

test('first-name matching preserves Unicode boundaries, possessives and modal Will',()=>{
 for(const name of ['Alex','Élodie','Jo-Anne','Will']){
  for(const subject of [name,name.toUpperCase(),`${name}'s tutor`,`${name}’s tutor`])assert.equal(personQuestionIssue(`Will ${subject} learn Spanish?`,name),undefined);
  for(const subject of [`É${name}`,`${name}é`,`𐐀${name}`,`${name}𐐀`])assert.ok(personQuestionIssue(`Will ${subject} learn Spanish?`,name));
 }
 assert.ok(personQuestionIssue('Will I learn Spanish?','Will'));
 assert.equal(personQuestionIssue('Will Jo-Anne practice?','Jo'),undefined);
 for(const [name,subject] of [['Σωκράτης','ΣΩΚΡΆΤΗΣ'],['Sam','ſam'],['Straße','STRAẞE']])assert.equal(personQuestionIssue(`Will ${subject} learn?`,name),undefined);
 assert.ok(personQuestionIssue('Will ıan learn?','Ian'));
 assert.ok(personQuestionIssue('Will STRASSE learn?','Straße'));
});

test('API and engine reject invalid names before model access',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('Unexpected model access');};
 try{
  for(const personName of ['', 'A.*','(a+)+$','A[lex','Alex Smith','a'.repeat(10000)+'!']){
   const context={personName,viewerBirthday:'1995-06-15'},question='Will I learn Spanish in six months?',facts={context_1:'Daily practice',horizon:'in 6 months'};
   for(const result of [await makePlan(question,{},provider(()=>undefined),context),await predict(question,facts,false,provider(()=>undefined),context)]){
    assert.equal(result.kind,'error');if(result.kind==='error')assert.equal(result.message,'Use a first name only.');
   }
   for(const action of ['plan','predict']){
    const response=await handler(()=>undefined)(new Request('http://localhost',{method:'POST',body:JSON.stringify({action,question,facts,...context})}));
    assert.equal(response.status,400);assert.equal((await response.json()).message,'Use a first name only.');
   }
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});

test('personal cards repair invented subjects once and keep them out of saved Why',async()=>{
 const original=globalThis.fetch;let attempts=0,wrong='What has PersonName already done to learn Spanish?',repair=true;
 const corrected='What have you already done to learn Spanish?';
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  const content=body.format.properties.cards?{cards:[{question:(++attempts%2===1||!repair)?wrong:corrected,options:['Completed ten lessons','Practiced with a friend','Practiced every day']}]}:body.format.properties.prediction?{prediction:'You will speak conversational Spanish.',basis:'context_1',assumption:'Your daily practice continues.'}:(body.format.properties.fits?{reason:'fixture',fits:true}:{category:'allow'});
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  const question='Will I be conversational in Spanish in six months?';
  for(wrong of ['What has PersonName already done to learn Spanish?','How often does Alex practice Spanish?']){
   attempts=0;repair=true;
   const plan=await makePlan(question,{},provider(()=>undefined));assert.equal(plan.kind,'ok');assert.equal(attempts,2);
   if(plan.kind!=='ok')continue;
   assert.equal(plan.value.cards[0].question,corrected);
   const facts={...plan.value.provided,context_1:`${plan.value.cards[0].question} I practice for thirty minutes every day`};
   const forecast=await predict(question,facts,false,provider(()=>undefined));assert.equal(forecast.kind,'ok');
   if(forecast.kind==='ok'){
    const saved=JSON.parse(JSON.stringify(forecast.value));
    for(const text of [saved.facts.context_1,saved.why,saved.deeperWhy]){assert.ok(text.includes(corrected));assert.ok(!text.includes(wrong));}
   }
   attempts=0;repair=false;
   assert.equal((await makePlan(question,{},provider(()=>undefined))).kind,'error');assert.equal(attempts,2);
  }
  wrong='How often do I practice Spanish?';attempts=0;repair=false;
  const normalized=await makePlan(question,{},provider(()=>undefined));assert.equal(normalized.kind,'ok');assert.equal(attempts,1);
  if(normalized.kind==='ok')assert.equal(normalized.value.cards[0].question,'How often do you practice Spanish?');
 }finally{globalThis.fetch=original;}
});

test('valid first names reach planning and forecasting through API and engine',async()=>{
 const original=globalThis.fetch;let name='Alex';
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  const content=body.format.properties.cards?{cards:[{question:`How often does ${name} practice?`,options:['Daily','Weekly','Rarely']}]}:body.format.properties.prediction?{prediction:`${name} will improve.`,basis:'context_1',assumption:`${name} keeps practicing regularly.`}:(body.format.properties.fits?{reason:'fixture',fits:true}:{category:'allow'});
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  for(name of ['Alex','Élodie','Jo-Anne','Will']){
   const context={personName:name,viewerBirthday:'1995-06-15'},question=`Will ${name} learn Spanish in six months?`,facts={context_1:'Daily practice',horizon:'in 6 months'};
   const plan=await makePlan(question,{},provider(()=>undefined),context);assert.equal(plan.kind,'ok');
   if(plan.kind==='ok')assert.equal(plan.value.cards[0].question,`How often does ${name} practice?`);
   const forecast=await predict(question,facts,false,provider(()=>undefined),context);assert.equal(forecast.kind,'ok');
   if(forecast.kind==='ok')assert.equal(forecast.value.headline,`${name} will improve in 6 months.`);
   for(const action of ['plan','predict']){
    const response=await handler(()=>undefined)(new Request('http://localhost',{method:'POST',body:JSON.stringify({action,question,facts,...context})}));
    assert.equal(response.status,200);assert.equal((await response.json()).kind,'ok');
   }
  }
 }finally{globalThis.fetch=original;}
});
