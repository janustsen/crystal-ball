import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAnswer,validateFact} from '../src/questions.ts';
import {forecastDueDate} from '../src/due-date.ts';
import {request} from '../src/api.ts';
import {handler} from '../server/handler.ts';
import type {Prediction} from '../src/types.ts';

test('answer validation and forecast generation share the local year boundary',async t=>{
 const oldTZ=process.env.TZ,originalFetch=globalThis.fetch,call=handler(()=>undefined);
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2027-01-01T00:30:00Z')});
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  if(body.action){
   const clientTZ=process.env.TZ;process.env.TZ='UTC';
   try{return await call(new Request('http://localhost',{method:'POST',body:JSON.stringify(body)}));}finally{process.env.TZ=clientTZ;}
  }
  const input=JSON.parse(body.messages[1].content);
  const content=body.format.properties.prediction?(input.choices.length?{prediction:input.choices[0]}:{prediction:'You will finish.',basis:'context_1',assumption:'Regular practice continues.'}):{category:'allow'};
  return Response.json({message:{content:JSON.stringify(content)}});
 };
 try{
  for(const [instant,zone,today,tomorrow,week] of [['2027-01-01T00:30:00Z','America/Los_Angeles','2026-12-31','2027-01-01','2027-01-07'],['2026-12-31T12:30:00Z','Pacific/Kiritimati','2027-01-01','2027-01-02','2027-01-08']]){
   t.mock.timers.setTime(Date.parse(instant));
   process.env.TZ=zone;
   for(const id of ['horizon','deadline']){
    if(zone==='America/Los_Angeles')assert.doesNotThrow(()=>validateAnswer('general',id,'by 2026'));
    else assert.throws(()=>validateAnswer('general',id,'by 2026'),/current or future/);
    assert.doesNotThrow(()=>validateAnswer('general',id,`by ${today.slice(0,4)}`));
    assert.doesNotThrow(()=>validateFact(id,`by ${today.slice(0,4)}`));
    for(const unit of ['days','weeks','months','years'])assert.throws(()=>validateAnswer('general',id,`in 1.5 ${unit}`),/whole/);
   }
   assert.doesNotThrow(()=>validateAnswer('growth','growth_weeks','1'));
   assert.throws(()=>validateAnswer('growth','growth_weeks','1.5'),/whole/);
   assert.equal(forecastDueDate('tomorrow'),tomorrow);assert.equal(forecastDueDate('in 1 week'),week);
   for(const [question,facts,expected] of [
    ['Will I finish?',{context_1:'Daily writing',horizon:`by ${today.slice(0,4)}`},`${today.slice(0,4)}-12-31`],
    ['Will I learn Spanish?',{level:'Intermediate',practice:'20 minutes',conversation:'Weekly',deadline:'tomorrow'},tomorrow],
    ['How many users will my project have?',{current_users:'10',weekly_growth:'2',growth_weeks:'1'},week],
   ] as const){
    const result=await request<Prediction>('predict',question,facts,false,new AbortController().signal,{ageConfirmed:true});
    assert.equal(result.kind,'ok',JSON.stringify(result));if(result.kind==='ok')assert.equal(result.value.dueDate,expected);
   }
  }
 }finally{globalThis.fetch=originalFetch;if(oldTZ===undefined)delete process.env.TZ;else process.env.TZ=oldTZ;}
});
