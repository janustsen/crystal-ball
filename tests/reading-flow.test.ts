import test from 'node:test';
import assert from 'node:assert/strict';
import {makePlan,predict,formatForecast} from '../server/engine.ts';
import {provider} from '../server/provider.ts';
import {validateFact} from '../src/questions.ts';
import {ageGroup,birthdayProfile,sunSign} from '../src/profile.ts';
import {birthChart} from '../src/birth-chart.ts';
import {forecastDueDate} from '../src/due-date.ts';
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
 const now='2026-01-31';
 assert.equal(forecastDueDate('within 1 month',now),'2026-02-28');
 assert.equal(forecastDueDate('this year',now),'2026-12-31');
 assert.equal(forecastDueDate('by 2028',now),'2028-12-31');
 assert.equal(forecastDueDate('within 3 weeks',now),'2026-02-21');
 assert.throws(()=>forecastDueDate('',now),/timeframe/);
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

test('all ages screen private-feelings output and allow kind activities',async()=>{
 const original=globalThis.fetch;
 let prediction='Alex will paint with you.';
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));const generatedOutput=body.messages[0].content.startsWith('Classify this generated forecast');
  const content=body.format.properties.prediction?{prediction,basis:'context_1',assumption:'You continue spending time together.'}:{category:generatedOutput&&prediction.includes('love')?'person':'allow'};
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  for(prediction of ['Alex will fall in love with you.','Alex will not secretly fall in love with you.'])for(const viewerBirthday of [undefined,'2010-01-01','1990-01-01']){
   const result=await predict('Will Alex secretly fall in love with me this year?',{context_1:'Alex and I attend a weekly painting class.',horizon:'this year'},false,provider(()=>undefined),{viewerBirthday,personName:'Alex'});
   assert.equal(result.kind,'blocked');if(result.kind==='blocked')assert.equal(result.category,'person');
  }
  prediction='Alex will paint with you.';
  const adult=await predict('Will Alex paint with me?',{context_1:'We talk every day',horizon:'within 3 months'},false,provider(()=>undefined),{viewerBirthday:'1990-01-01',personName:'Alex'});
  assert.equal(adult.kind,'ok');if(adult.kind==='ok'){assert.match(adult.value.label,/For fun/);assert.match(adult.value.dueDate!,/^\d{4}-\d{2}-\d{2}$/);assert.ok(adult.value.astrology);assert.ok(adult.value.deeperWhy);}
 }finally{globalThis.fetch=original;}
});

test('a model decade and a supplied ten-year horizon are the same timeframe',()=>{assert.equal(formatForecast('Your net worth will grow over the next decade.','in 10 years'),'Your net worth will grow over the next decade.');});

test('Due dates cover next week, long growth periods, and each duration unit',()=>{
 const now='2026-09-30';
 for(const [horizon,expected] of [['next week','2026-10-11'],['this week','2026-10-04'],['in 104 weeks','2028-09-27'],['in 520 weeks','2036-09-17'],['within a year','2027-09-30'],['for a year','2027-09-30'],['in two months','2026-11-30'],['in 10 days','2026-10-10'],['in 2030','2030-12-31'],['in 2100','2100-12-31']])assert.equal(forecastDueDate(horizon,now),expected,horizon);
});

test('forecast outputs resolve typed and general horizons before rendering both representations',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-09-30T12:00:00Z')});
 const original=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('/rss/'))return new Response('<rss/>');
  const body=JSON.parse(String(init?.body)),input=JSON.parse(body.messages[1].content);
  const content=body.format.properties.prediction?(input.choices.length?{prediction:input.choices[0]}:{prediction:'You will make progress.',basis:'context_1',assumption:'Your regular effort continues.'}):{category:'allow'};
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 const move={location:'Boston',destination:'Berlin',work:'Remote',lease:'Within 3 months',runway:'6 months'};
 const cases:{question:string;facts:Record<string,string>;headline:RegExp;due:string}[]=[
  {question:'Who will win the Men’s World Cup?',facts:{competition:'Men’s World Cup',edition:'2030',team:'Spain'},headline:/2030 Men’s World Cup/,due:'2027-09-30'},
  {question:'Who will win the Women’s World Cup?',facts:{competition:'Women’s World Cup',edition:'2027',team:'Spain'},headline:/2027 Women’s World Cup/,due:'2027-09-30'},
  {question:'Who will win the NBA championship?',facts:{competition:'NBA championship',edition:'2028',team:'Lakers'},headline:/2028 NBA championship/,due:'2027-09-30'},
  {question:'Will I move to Berlin?',facts:move,headline:/move to Berlin within a year/,due:'2027-09-30'},
  {question:'Will I move to Berlin?',facts:{...move,work:'Need a new job'},headline:/stay in Boston for a year/,due:'2027-09-30'},
  {question:'How many users will my project have?',facts:{current_users:'100',weekly_growth:'2',growth_weeks:'104'},headline:/308 users in 104 weeks/,due:'2027-09-30'},
  {question:'What will my net worth be in 10 years?',facts:{currency:'USD',assets:'10000',debt:'0',monthly_saving:'100',return:'0',saving_growth:'0',withdrawals:'0',windfall:'0',inflation:'No, future money'},headline:/22,000 in 10 years/,due:'2027-09-30'},
  {question:'Will I learn Spanish in six months?',facts:{level:'Intermediate',practice:'20 minutes',conversation:'Weekly'},headline:/Spanish in 6 months/,due:'2027-03-30'},
  {question:'Will EVs lead global sales?',facts:{definition:'A noticeable shift',scenario:'Support increases',evidence:'No additional evidence'},headline:/share in 2027/,due:'2027-09-30'},
  {question:'Will I finish next week?',facts:{context_1:'Daily work'},headline:/next week/,due:'2026-10-11'},
  {question:'Will I finish?',facts:{context_1:'Daily work',horizon:'2 months'},headline:/within 2 months/,due:'2026-11-30'},
 ];
 try{for(const c of cases){const result=await predict(c.question,c.facts,false,provider(()=>undefined));assert.equal(result.kind,'ok',JSON.stringify(result));if(result.kind==='ok'){assert.match(result.value.headline,c.headline);assert.equal(result.value.dueDate,c.due,c.question);}}}finally{globalThis.fetch=original;}
});

test('Person readings isolate all owner topics and repair wrong-subject cards and forecasts',async()=>{
 const original=globalThis.fetch;
 const known={birthday:'1990-01-01',current_focus:'Money',learning_target:'Spanish',level:'Intermediate',practice:'20 minutes',conversation:'Weekly',currency:'USD',assets:'10000',debt:'0',monthly_saving:'100',return:'0',saving_growth:'0',withdrawals:'0',windfall:'0',inflation:'No, future money',location:'Boston',destination:'Berlin',work:'Remote',lease:'Within 3 months',runway:'6 months',current_users:'100',weekly_growth:'2'};
 let cards=0,forecasts=0,alwaysWrong=false;
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body)),input=JSON.parse(body.messages[1].content);
  let content:unknown={category:'allow'};
  if(body.format.properties.cards){
   cards++;assert.deepEqual(input.known,{});
   content={cards:[{question:body.messages.length===2?'How often do you practice?':'How often does Alex practice?',options:['Daily','Weekly','Rarely']}]};
  }else if(body.format.properties.prediction){
   forecasts++;assert.deepEqual(Object.keys(input.facts).sort(),['context_1','horizon']);assert.deepEqual(input.choices,[]);
   content={prediction:alwaysWrong||body.messages.length===2?'You will make progress.':'Alex will make progress.',basis:'context_1',assumption:'Alex keeps practicing regularly.'};
  }
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  for(const question of ['Will Alex learn Spanish in six months?','What will Alex’s net worth be in ten years?','Where will Alex live next year?','How many users will Alex’s project have?','Will my friend Alex learn Spanish in six months?']){
   const context={personName:'Alex',viewerBirthday:'1990-01-01'};
   const plan=await makePlan(question,known,provider(()=>undefined),context);assert.equal(plan.kind,'ok',JSON.stringify(plan));if(plan.kind!=='ok')continue;
   assert.equal(plan.value.topic,'general');assert.ok(plan.value.cards.every(c=>!c.remember));assert.equal(plan.value.cards[0].question,'How often does Alex practice?');
   const answers=Object.fromEntries(plan.value.cards.map(c=>[c.id,c.options[0]]));
   const result=await predict(question,{...known,...plan.value.provided,...answers},false,provider(()=>undefined),context);assert.equal(result.kind,'ok',JSON.stringify(result));if(result.kind==='ok'){assert.match(result.value.headline,/^Alex will/);assert.deepEqual(Object.keys(result.value.facts).sort(),['context_1','horizon']);}
  }
  assert.equal(cards,10);assert.equal(forecasts,10);
  alwaysWrong=true;
  const rejected=await predict('Will Alex learn Spanish?',{...known,context_1:'Daily practice',horizon:'within 6 months'},false,provider(()=>undefined),{personName:'Alex'});
  assert.equal(rejected.kind,'error');assert.equal(forecasts,12);
 }finally{globalThis.fetch=original;}
});

test('answer options read as the asker’s own replies, not statements about them',async()=>{
 const original=globalThis.fetch;
 let drafts=0;
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  const content=body.format.properties.cards?(drafts++?{cards:[{factor:'free time',question:'What do you do most weekends?',options:['Hiking in nature.','Cooking with family','I’ve been reading']}]}:{cards:[{factor:'free time',question:'What do you enjoy most right now?',options:['You enjoy hiking in nature.','You like cooking with family.','You prefer reading books.']}]}):{category:'allow'};
  return new Response(JSON.stringify({message:{content:JSON.stringify(content)}}));
 };
 try{
  const plan=await makePlan('What will make me happiest this year?',{},provider(()=>undefined));
  assert.equal(plan.kind,'ok');if(plan.kind!=='ok')return;
  assert.equal(drafts,2);
  assert.deepEqual(plan.value.cards[0].options,['Hiking in nature','Cooking with family','Been reading','Other']);
 }finally{globalThis.fetch=original}
});
