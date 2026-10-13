import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastDueDate} from '../src/due-date.ts';
import {validateAnswer} from '../src/questions.ts';
import {makePlan,predict} from '../server/engine.ts';
import {provider} from '../server/provider.ts';

test('timeframe inputs resolve completely or fail before outcome generation',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-09-30T12:00:00Z')});
 assert.equal(forecastDueDate('tomorrow'),'2026-10-01');
 assert.equal(forecastDueDate('next week'),'2026-10-11');
 assert.equal(forecastDueDate('in 104 weeks'),'2028-09-27');
 assert.equal(forecastDueDate('in 2030'),'2030-12-31');
 assert.equal(forecastDueDate('in 1 month','2026-01-31'),'2026-02-28');
 const original=globalThis.fetch;let outcomes=0;
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body)),input=JSON.parse(body.messages[1].content);
  const content=body.format.properties.prediction?(outcomes++,input.choices.length?{prediction:input.choices[0]}:{prediction:'You will finish the draft.',basis:'context_1',insight:'Your regular writing continues.'}):(body.format.properties.fits?{reason:'fixture',fits:true}:{category:'allow'});
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  for(const [topic,key,question,facts] of [
   ['general','horizon','Will I finish my draft?',{context_1:'Daily writing'}],
   ['learning','deadline','Will I learn Spanish?',{level:'Intermediate',practice:'20 minutes',conversation:'Weekly'}],
  ] as const){
   validateAnswer(topic,key,'tomorrow');
   const good=await predict(question,{...facts,[key]:'tomorrow'},false,provider(()=>undefined));
   assert.equal(good.kind,'ok',JSON.stringify(good));
   if(good.kind==='ok'){assert.equal(good.value.dueDate,'2026-10-01');assert.match(good.value.headline,/tomorrow/);}
   const before=outcomes;
   for(const horizon of ['eventually','tomorrow or in 3 months','in 3 months after graduation','in 0 months','in 1.5 years','by 2020','']){
    assert.throws(()=>validateAnswer(topic,key,horizon),/timeframe/);
    const bad=await predict(question,{...facts,[key]:horizon},false,provider(()=>undefined));
    assert.equal(bad.kind,'error',horizon);
   }
   assert.equal(outcomes,before);
  }
 }finally{globalThis.fetch=original;}
});

test('Person names survive planning and forecasts without disabling keyword restrictions',async()=>{
 const original=globalThis.fetch;let name='Will',badCard=false,badForecast=false,missingVerb=false;
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  const content=body.format.properties.cards?{cards:[{question:badCard?`What will ${name} achieve?`:`How often does ${name} practice?`,options:[`${name} practices daily`,`${name} practices weekly`,'No regular practice']}]}:body.format.properties.prediction?{prediction:missingVerb?`${name} practices daily.`:badForecast?`${name} will likely improve.`:`${name} will improve.`,basis:'context_1',insight:`${name} continues regular practice.`}:(body.format.properties.fits?{reason:'fixture',fits:true}:{category:'allow'});
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  for(name of ['Will','May','My']){
   const context={personName:name,viewerBirthday:'1990-01-01'},question=`Will ${name} learn Spanish in six months?`;
   const plan=await makePlan(question,{},provider(()=>undefined),context);assert.equal(plan.kind,'ok',JSON.stringify(plan));
   if(plan.kind==='ok'){assert.equal(plan.value.cards[0].question,`How often does ${name} practice?`);assert.equal(plan.value.cards[0].options[0],`${name} practices daily`);}
   const facts={context_1:'Daily practice',horizon:'in 6 months'};
   const good=await predict(question,facts,false,provider(()=>undefined),context);assert.equal(good.kind,'ok',JSON.stringify(good));
   if(good.kind==='ok')assert.equal(good.value.headline,`${name} will improve in 6 months.`);
   badCard=true;assert.equal((await makePlan(question,{},provider(()=>undefined),context)).kind,'error');badCard=false;
   badForecast=true;assert.equal((await predict(question,facts,false,provider(()=>undefined),context)).kind,'error');badForecast=false;
   missingVerb=true;assert.equal((await predict(question,facts,false,provider(()=>undefined),context)).kind,'error');missingVerb=false;
  }
 }finally{globalThis.fetch=original;}
});


test('repeated Person names are accepted in cards and options while modal will is rejected',async()=>{
 const original=globalThis.fetch;
 const question="How often does Will practice with Will's tutor?";
 const options=["Will practices with Will's tutor daily","Will practices with Will’s tutor weekly",'No regular practice'];
 let card={question,options},attempts=0;
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  if(body.format.properties.cards)attempts++;
  const content=body.format.properties.cards?{cards:[card]}:(body.format.properties.fits?{reason:'fixture',fits:true}:{category:'allow'});
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  const plan=()=>makePlan('Will Will learn Spanish in six months?',{},provider(()=>undefined),{personName:'Will'});
  const good=await plan();assert.equal(good.kind,'ok',JSON.stringify(good));assert.equal(attempts,1);
  if(good.kind==='ok'){assert.equal(good.value.cards[0].question,question);assert.deepEqual(good.value.cards[0].options,[...options,'Other']);}
  for(const invalid of [
   {question:"How often will Will practice with Will's tutor?",options},
   {question:'Will Will practice with Will’s tutor?',options},
   {question,options:["Will will practice with Will's tutor",...options.slice(1)]},
  ]){
   card=invalid;const before:number=attempts;
   assert.equal((await plan()).kind,'error');assert.equal(attempts-before,2);
  }
 }finally{globalThis.fetch=original;}
});

test('short financial forecasts allow the supplied timeframe but reject invented amounts',async()=>{
 const original=globalThis.fetch;let attempts=0,verdict='Your net worth will grow significantly in 10 years.';
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  const content=body.format.properties.prediction?{prediction:++attempts%2?'You will have a net worth of $1.5 million in 10 years.':verdict,basis:'context_1',insight:'You maintain your current spending and investment habits.'}:(body.format.properties.fits?{reason:'fixture',fits:true}:{category:'allow'});
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  const run=()=>predict('What will my net worth be in 10 years?',{context_1:'What is your current net worth? $500,000 now',horizon:'in 10 years'},false,provider(()=>undefined),{viewerBirthday:'1995-06-15'});
  const good=await run();assert.equal(good.kind,'ok',JSON.stringify(good));assert.equal(attempts,2);
  if(good.kind==='ok')assert.equal(good.value.headline,verdict);
  for(const amount of ['$900,000','$10','ten dollars']){
   verdict=`Your net worth will reach ${amount} in 10 years.`;
   const before=attempts;
   assert.equal((await run()).kind,'error',amount);assert.equal(attempts-before,2);
  }
 }finally{globalThis.fetch=original;}
});
