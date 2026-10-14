import test from 'node:test';
import assert from 'node:assert/strict';
import {moonSvg,skyLine,skyOn} from '../src/real-sky.ts';
import {personalOmen} from '../server/omen.ts';
import {validatedProvider,type ModelProvider} from '../server/provider.ts';

test('the sky is the real one, and each event falls on exactly one day',()=>{
 assert.equal(skyLine(skyOn('2026-10-14')),'waxing Moon in Sagittarius');
 const events:Record<string,string>={};
 for(let day=Date.parse('2026-10-01');day<Date.parse('2026-12-01');day+=864e5){const date=new Date(day).toISOString().slice(0,10),event=skyOn(date).event;if(event)events[date]=event;}
 // Published 2026 dates: new moons 10 Oct and 9 Nov, full moons 26 Oct and 24 Nov, Mercury stations retrograde 24 Oct.
 assert.deepEqual(events,{'2026-10-10':'new-moon','2026-10-24':'mercury-retrograde','2026-10-26':'full-moon','2026-11-09':'new-moon','2026-11-24':'full-moon'});
 assert.equal(skyLine(skyOn('2026-10-26')),'full Moon in Taurus, Mercury retrograde');
 assert.equal(skyLine(skyOn('2026-10-20')).split(',')[0].split(' ')[0],'waxing');
 assert.equal(skyLine(skyOn('2026-11-01')).split(' ')[0],'waning');
});

test('the drawn moon is lit from the right while waxing and fills at full',()=>{
 assert.match(moonSvg(180,'#fff'),/A1\.000,1 0 0 1 0,-1Z"/);
 assert.match(moonSvg(45,'#fff'),/A0\.707,1 0 0 0 0,-1Z"/);
 assert.doesNotMatch(moonSvg(45,'#fff'),/scale/);
 assert.match(moonSvg(300,'#fff'),/scale\(-1,1\)/);
});

test('the omen reads the day’s real sky and may name the Moon’s sign beside the Sun sign',async()=>{
 const inputs:unknown[]=[];
 const model:ModelProvider={async json<T>(_system:string,input:unknown,_schema:unknown,validate?:(value:unknown)=>unknown){
  inputs.push(input);
  const value={text:'Gemini, tonight’s full Moon in Taurus lights a path you already know.',whisper:'By tonight, a small plan may change for the better.'};
  assert.equal(validate?.(value),true);
  return value as T;
 }};
 await personalOmen({sun_sign:'gemini'},model,skyOn('2026-10-26'));
 assert.deepEqual(inputs,[{sunSign:'gemini',sky:'full Moon in Taurus, Mercury retrograde',skyEvent:'Full Moon',facts:{sun_sign:'gemini'}}]);
});

test('Moon positions do not authorize personal signs, including repeated mentions',async()=>{
 const sky=skyOn('2026-10-14');
 const whisper='By tonight, a small plan may change for the better.';
 for(const [sunSign,text,valid] of [
  [undefined,'Sagittarius, a gentle light invites you to begin again.',false],
  [undefined,'The Moon in Sagittarius invites you to begin again.',true],
  [undefined,'Sagittarius, the Moon in Sagittarius invites you to begin again.',false],
  ['gemini','Gemini, Sagittarius invites you to begin again with gentle hope.',false],
  ['gemini','Gemini, the Moon in Sagittarius invites you to begin again.',true],
  ['sagittarius','The Moon in Sagittarius invites you to begin again.',false],
  ['sagittarius','Sagittarius, the Moon in Sagittarius invites you to begin again.',true],
  [undefined,'The Moon in Gemini invites you to begin again.',false],
  [undefined,'A gentle light invites you to begin again today.',true],
 ] as const){
  let calls=0;
  const model=validatedProvider(async()=>{calls++;return JSON.stringify({text,whisper});});
  const result=personalOmen(sunSign?{sun_sign:sunSign}:{},model,sky);
  if(valid)assert.deepEqual(await result,{text,whisper});
  else await assert.rejects(result,/mist is too thick/);
  assert.equal(calls,valid?1:2,text);
 }
 let calls=0;
 const repaired={text:'The Moon in Sagittarius invites you to begin again.',whisper};
 const model=validatedProvider(async messages=>{
  calls++;
  if(calls===1)return JSON.stringify({text:'Sagittarius, a gentle light invites you to begin again.',whisper});
  assert.match(messages.at(-1)!.content,/Do not assign or address the viewer by any sign/);
  assert.match(messages.at(-1)!.content,/Moon in sagittarius/);
  return JSON.stringify(repaired);
 });
 assert.deepEqual(await personalOmen({},model,sky),repaired);
 assert.equal(calls,2);
 for(const sunSign of [undefined,'sagittarius']){
  const model=validatedProvider(async()=>JSON.stringify({text: sunSign?'Sagittarius, a gentle light invites you to begin again.':repaired.text,whisper:'By tonight, the Moon in Sagittarius may bring a surprise.'}));
  await assert.rejects(personalOmen(sunSign?{sun_sign:sunSign}:{},model,sky),/mist is too thick/);
 }
});

test('events follow local calendar days and the sky cache includes the zone',()=>{
 assert.equal(skyOn('2026-10-25','America/Los_Angeles').event,'full-moon');
 assert.notEqual(skyOn('2026-10-26','America/Los_Angeles').event,'full-moon');
 assert.equal(skyOn('2026-10-26','UTC').event,'full-moon');
 assert.equal(skyOn('2026-10-25','UTC').event,null);
 assert.equal(skyOn('2026-10-25','America/Los_Angeles').event,'full-moon');
 for(const [day,zone,fixed] of [
  ['2026-10-25','America/Los_Angeles','Etc/GMT+7'],
  ['2026-11-01','America/Los_Angeles','Etc/GMT+8'],
  ['2026-03-08','America/Los_Angeles','Etc/GMT+7'],
  ['2026-10-25','Asia/Tokyo','Etc/GMT-9'],
 ])assert.equal(skyOn(day,zone).angle,skyOn(day,fixed).angle,`${day} evening offset`);
 assert.notEqual(skyOn('2026-10-25','America/Los_Angeles').angle,skyOn('2026-10-25','UTC').angle);
 assert.throws(()=>skyOn('2026-02-30','UTC'));
 assert.throws(()=>skyOn('2026-10-25','Not/AZone'));
});

test('omen requests validate time context and deliver the same local sky to the model',async()=>{
 const {handler}=await import('../server/handler.ts');
 const inputs:{sky:string;skyEvent:string|null}[]=[];
 const model=validatedProvider(async messages=>{
  const input=JSON.parse(messages[1].content);inputs.push(input);
  return JSON.stringify({text:input.skyEvent?`${input.skyEvent} invites you to pause and begin again gently.`:'A gentle light invites you to begin again today.',whisper:'By tonight, a small plan may change for the better.'});
 });
 const serve=handler(()=>undefined,model);
 const send=(context:Record<string,unknown>)=>serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'omen',question:'Today’s personal omen',facts:{},ageConfirmed:true,...context})}));
 for(const timeZone of ['America/Los_Angeles','UTC','Asia/Tokyo']){
  assert.equal((await send({localDate:'2026-10-25',timeZone})).status,200);
  const sky=skyOn('2026-10-25',timeZone);
  assert.equal(inputs.at(-1)!.sky,skyLine(sky));
  assert.equal(inputs.at(-1)!.skyEvent,sky.event==='full-moon'?'Full Moon':null);
 }
 const count=inputs.length;
 for(const context of [{},{localDate:'2026-10-25'},{timeZone:'UTC'},{localDate:'2026-02-30',timeZone:'UTC'},{localDate:'2026-10-25',timeZone:4},{localDate:'2026-10-25',timeZone:''},{localDate:'2026-10-25',timeZone:'Not/AZone'}])assert.equal((await send(context)).status,400);
 assert.equal(inputs.length,count);
 const {requestOmen}=await import('../src/api.ts');
 const {localDay}=await import('../src/retention.ts');
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(_url,init)=>{
   const body=JSON.parse(String(init?.body));
   assert.equal(body.localDate,localDay());
   assert.equal(body.timeZone,Intl.DateTimeFormat().resolvedOptions().timeZone);
   return serve(new Request('http://localhost',init));
  };
  await requestOmen({},{sunSign:null,ageConfirmed:true});
  assert.equal(inputs.at(-1)!.sky,skyLine(skyOn(localDay(),Intl.DateTimeFormat().resolvedOptions().timeZone)));
 }finally{globalThis.fetch=original}
});


test('each event requires its own reference in the omen, with one repair then failure',async()=>{
 const ordinary='A gentle light invites you to begin again today.';
 const whisper='By tonight, a small plan may change for the better.';
 for(const [day,zone,event] of [
  ['2026-10-25','America/Los_Angeles','Full Moon'],
  ['2026-10-10','UTC','New Moon'],
  ['2026-10-24','UTC','Mercury retrograde'],
 ]){
  const sky=skyOn(day,zone),text=`${event.toUpperCase().replace(' ','  ')} invites you to pause and begin again gently.`;
  for(const wrong of [ordinary,`${event==='Full Moon'?'New Moon':'Full Moon'} invites you to begin again gently.`,`${event}light invites you to pause and begin again gently.`]){
   let calls=0;
   const model=validatedProvider(async()=>{calls++;return JSON.stringify({text:wrong,whisper});});
   await assert.rejects(personalOmen({},model,sky),/mist is too thick/);
   assert.equal(calls,2);
  }
  let calls=0;
  const model=validatedProvider(async messages=>{
   calls++;
   if(calls===1)return JSON.stringify({text:ordinary,whisper});
   assert.ok(messages.at(-1)!.content.includes(`Name ${event} in the omen text`));
   return JSON.stringify({text,whisper});
  });
  assert.deepEqual(await personalOmen({},model,sky),{text,whisper});
  assert.equal(calls,2);
  const whisperOnly=validatedProvider(async()=>JSON.stringify({text:ordinary,whisper:`By tonight, ${event} may invite a small change.`}));
  await assert.rejects(personalOmen({},whisperOnly,sky),/mist is too thick/);
 }
 const model=validatedProvider(async()=>JSON.stringify({text:ordinary,whisper}));
 assert.deepEqual(await personalOmen({},model,skyOn('2026-10-14')),{text:ordinary,whisper});
});
