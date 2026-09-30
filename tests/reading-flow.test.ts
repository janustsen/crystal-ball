import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlan,predict,formatForecast} from '../server/engine.ts';
import {provider} from '../server/provider.ts';
import {validateFact} from '../src/questions.ts';
import {ageGroup,birthdayProfile,sunSign} from '../src/profile.ts';
import {birthChart} from '../src/birth-chart.ts';
import {forecastDueDate} from '../server/due-date.ts';
import {handler} from '../server/handler.ts';

test('one and two card model plans reach a forecast; missing timeframe reserves one card',async()=>{
 const original=globalThis.fetch;
 let count=1;
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body)),input=JSON.parse(body.messages[1].content);
  const content=body.format.properties.cards?{cards:[{question:'How much have you written?',options:['No draft','Half a draft','Full draft']},{question:'How often do you write?',options:['Daily','Weekly','Rarely']}].slice(0,Math.min(count,body.format.properties.cards.maxItems))}:body.format.properties.prediction?{prediction:'You will finish your novel.',basis:'context_1',assumption:'Your writing routine continues.'}:{category:'allow'};
  if(body.format.properties.cards)assert.equal(input.known.current_focus,'Learning & growth');
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  for(const question of ['Will I finish my novel this year?','Will I finish my novel?'])for(count=1;count<=2;count++){
   const plan=await makePlan(question,{current_focus:'Learning & growth'},provider(()=>undefined));assert.equal(plan.kind,'ok');if(plan.kind!=='ok')continue;
   assert.equal(plan.value.cards.length,question.includes('this year')?count:2);
   const facts={...plan.value.provided,...Object.fromEntries(plan.value.cards.map(c=>[c.id,c.options[0]]))};
   const result=await predict(question,facts,false,provider(()=>undefined));assert.equal(result.kind,'ok');
  }
 }finally{globalThis.fetch=original;}
});

test('typed scenarios ask only missing inputs and keep their actual calculation',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body)),input=JSON.parse(body.messages[1].content);return new Response(JSON.stringify({message:{content:JSON.stringify(input.choices?{prediction:input.choices[0]}:{category:'allow'})}}));};
 try{
  const question='How many users will my project have?',known={current_users:'100'};
  const plan=await makePlan(question,known,provider(()=>undefined));assert.equal(plan.kind,'ok');if(plan.kind!=='ok')return;
  assert.deepEqual(plan.value.cards.map(c=>c.id),['weekly_growth','growth_weeks']);
  const result=await predict(question,{...known,weekly_growth:'2',growth_weeks:'4'},false,provider(()=>undefined));assert.equal(result.kind,'ok');if(result.kind==='ok')assert.match(result.value.why,/100.*2.*4.*108/);
 }finally{globalThis.fetch=original;}
});

test('birthday facts validate real calendar dates for onboarding and later edits',()=>{
 validateFact('birthday','2000-02-29');
 for(const value of ['2001-02-29','2020-13-01','tomorrow','2999-01-01','2020-2-1'])assert.throws(()=>validateFact('birthday',value));
});

test('profile contract keeps unknown ages teen-safe and applies exact birthday boundaries',()=>{
 assert.equal(ageGroup(undefined),'unknown');
 assert.equal(ageGroup('2013-10-01','2026-09-30'),'under13');
 assert.equal(ageGroup('2013-09-30','2026-09-30'),'teen');
 assert.equal(ageGroup('2008-10-01','2026-09-30'),'teen');
 assert.equal(ageGroup('2008-09-30','2026-09-30'),'adult');
 assert.equal(birthdayProfile().ageBand,null);assert.equal(birthdayProfile().sunSign,null);
 assert.equal(sunSign('1995-06-15'),'gemini');assert.equal(sunSign('2000-01-01'),'capricorn');
 assert.throws(()=>birthdayProfile('2020-01-01'),/13/);
});

test('local ephemeris uses birth time and location for Moon and rising',()=>{
 assert.deepEqual(birthChart('1995-06-15','12:30',55.6761,12.5683),{moonSign:'capricorn',risingSign:'virgo'});
 assert.notEqual(birthChart('1995-06-15','18:30',55.6761,12.5683).risingSign,'virgo');
 assert.throws(()=>birthChart('1995-06-15','25:30',55,12));
 assert.throws(()=>birthChart('1995-06-15','12:30',91,12));
});

test('Due dates preserve horizons and clamp calendar months instead of overflowing',()=>{
 const now=new Date('2026-01-31T12:00:00Z');
 assert.equal(forecastDueDate('Will I finish?',{horizon:'within 1 month'},now),'2026-02-28');
 assert.equal(forecastDueDate('Will I finish this year?',{},now),'2026-12-31');
 assert.equal(forecastDueDate('Will I finish by 2028?',{},now),'2028-12-31');
 assert.equal(forecastDueDate('Will I finish?',{horizon:'within 3 weeks'},now),'2026-02-21');
 assert.equal(forecastDueDate('Will I finish?',{},now),'2026-05-01');
});

test('HTTP boundary rejects under-13 readings and full names before model calls',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('Should not call model');};
 try{
  for(const context of [{viewerBirthday:'2020-01-01'},{personName:'Alex Smith'},{viewerBirthday:'not a date'}]){
   const result=await handler(()=>undefined)(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'plan',question:'Will we become friends?',facts:{},...context})}));
   assert.equal(result.status,400);assert.equal((await result.json()).kind,'error');
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});

test('teen and unknown output is screened for private-feelings claims; adults retain for-fun label',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));const teenOutput=body.messages[0].content.includes('Return person for any cruel');
  const content=body.format.properties.prediction?{prediction:'Alex will fall in love with you.',basis:'context_1',assumption:'You continue spending time together.'}:{category:teenOutput?'person':'allow'};
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  for(const viewerBirthday of [undefined,'2010-01-01']){
   const result=await predict('Will Alex fall in love?',{context_1:'We talk every day',horizon:'within 3 months'},false,provider(()=>undefined),{viewerBirthday,personName:'Alex'});
   assert.equal(result.kind,'blocked');if(result.kind==='blocked')assert.equal(result.category,'person');
  }
  const adult=await predict('Will Alex fall in love?',{context_1:'We talk every day',horizon:'within 3 months'},false,provider(()=>undefined),{viewerBirthday:'1990-01-01',personName:'Alex'});
  assert.equal(adult.kind,'ok');if(adult.kind==='ok'){assert.match(adult.value.label,/For fun/);assert.match(adult.value.dueDate!,/^\d{4}-\d{2}-\d{2}$/);assert.ok(adult.value.astrology);assert.ok(adult.value.deeperWhy);}
 }finally{globalThis.fetch=original;}
});

test('a model decade and a supplied ten-year horizon are the same timeframe',()=>{assert.equal(formatForecast('Your net worth will grow over the next decade.','in 10 years'),'Your net worth will grow over the next decade.');});
