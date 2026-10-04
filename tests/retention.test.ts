import test from 'node:test';
import assert from 'node:assert/strict';
import {checkInDate,localDay,suggestedCheckIn} from '../src/retention';
import {nativeActions,type NativePorts} from '../src/integration-actions';
import type {Prediction} from '../src/types';
const reading:Prediction={id:'reading-1',createdAt:'2026-01-31T12:00:00',headline:'You will finish within a month.',question:'Will I finish?',label:'Speculative',why:'',facts:{},sources:[],assumptions:[],friend:false};
test('ball Due date wins; legacy forecasts keep 30 days without a migration',()=>{
 assert.equal(suggestedCheckIn(reading),'2026-03-02');
 assert.equal(suggestedCheckIn({...reading,dueDate:'2030-06-03'}),'2030-06-03');
 assert.equal(suggestedCheckIn({...reading,dueDate:'2026-02-30'}),'2026-03-02');
 assert.equal(checkInDate('2026-02-30'),null);
 assert.equal(checkInDate('2026-2-3'),null);
 assert.ok(checkInDate('2028-02-29'));
});
test('real reminder action passes the reading id and date to native scheduling; web and bad dates never schedule',async()=>{
 const scheduled:unknown[][]=[];
 const ports:NativePorts={platform:'ios',notifications:{cancel:async()=>{},clear:async()=>{},permission:async()=>true,schedule:async(...args)=>{scheduled.push(args)}},share:async()=>{},link:()=>''};
 const on=localDay(new Date(Date.now()+86400000*5));
 const before=Date.now();
 assert.match(await nativeActions(ports).reminder(reading.headline,reading.id,on),/reminder set/);
 assert.equal(scheduled[0][0],'Did it come true?');assert.equal(scheduled[0][3],reading.id);
 assert.ok(Math.abs(Number(scheduled[0][2])-((checkInDate(on)!.getTime()-before)/1000))<2);
 await nativeActions(ports).reminder('',reading.id,'2026-02-30');assert.equal(scheduled.length,2);
 assert.match(await nativeActions(ports).reminder('',reading.id,'2000-01-01'),/ready for a Check-in/);assert.equal(scheduled.length,2);
 ports.platform='web';assert.match(await nativeActions(ports).reminder('',reading.id,on),/Native reminder preview/);assert.equal(scheduled.length,2);
});

import {loadDailyOmen,invalidateOmen,omenKey} from '../src/daily-omen';
import {handler} from '../server/handler';
test('personal omen claims each local day before generation, caches failures and coalesces callers',async()=>{
 invalidateOmen();const values=new Map<string,string>();let calls=0;
 const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value)}};
 const facts={sun_sign:'Libra',learning_target:'Spanish'};
 const generate=async(input:Record<string,string>)=>{calls++;assert.deepEqual(input,facts);assert.equal(JSON.parse(values.get(omenKey)!).text,null);return 'Libra, let a new Spanish word be your little constellation today.'};
 const today=new Date(2026,8,30,10);
 const [first,second]=await Promise.all([loadDailyOmen(storage,facts,generate,()=>today),loadDailyOmen(storage,facts,generate,()=>today)]);
 assert.deepEqual(first,second);assert.equal(calls,1);
 assert.deepEqual(await loadDailyOmen(storage,{},async()=>{throw new Error('must not regenerate')},()=>today),first);
 const tomorrow=new Date(2026,9,1);
 const failed=await loadDailyOmen(storage,facts,async()=>{calls++;throw new Error('offline')},()=>tomorrow);assert.equal(failed.text,null);
 await loadDailyOmen(storage,facts,generate,()=>tomorrow);assert.equal(calls,2);
 invalidateOmen();await loadDailyOmen(storage,facts,generate,()=>tomorrow);assert.equal(calls,2,'reload retains the claimed day');
});
test('reset during generation prevents a private omen from being saved after reset',async()=>{
 invalidateOmen();const values=new Map<string,string>();let finish!:(text:string)=>void;
 const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value)}};
 const call=loadDailyOmen(storage,{},()=>new Promise(resolve=>{finish=resolve}));
 while(!finish)await new Promise(resolve=>setTimeout(resolve,0));
 invalidateOmen();values.clear();finish('Private old omen');assert.equal((await call).text,null);assert.equal(values.size,0);
});
test('omen endpoint shares input limits and forwards Sun sign and facts to the real generator',async()=>{
 const fetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body));assert.equal(body.options.num_predict,160);assert.deepEqual(JSON.parse(body.messages[1].content).facts,{sun_sign:'Libra',learning_target:'Spanish'});return new Response(JSON.stringify({message:{content:JSON.stringify({text:'Libra, a new Spanish word may brighten your constellation today.'})}}));};
 try{
  const serve=handler(()=>undefined);
  const response=await serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'omen',ageConfirmed:true,question:'Today’s personal omen',facts:{sun_sign:'Libra',learning_target:'Spanish'}})}));
  assert.equal(response.status,200);assert.equal((await response.json()).kind,'ok');assert.equal(calls,1);
  const invalid=await serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'omen',ageConfirmed:true,question:'Today’s personal omen',facts:{sun_sign:100}})}));assert.equal(invalid.status,400);assert.equal(calls,1);
 }finally{globalThis.fetch=fetch;}
});
test('omen repairs invented signs and clipped sentences once, then fails closed',async()=>{
 const fetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({message:{content:JSON.stringify({text:calls===1?'Pisces, follow a gentle light.':'A little starlight invites a fresh beginning.'})}}));};
 try{
  const {personalOmen}=await import('../server/omen');const {provider}=await import('../server/provider');
  assert.equal(await personalOmen({},provider(()=>undefined,160)),'A little starlight invites a fresh beginning.');assert.equal(calls,2);
  calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({message:{content:'{"text":"A gentle light reminds you to follow your h"}'}}));};
  await assert.rejects(personalOmen({},provider(()=>undefined,160)));assert.equal(calls,2);
 }finally{globalThis.fetch=fetch;}
});
test('omen token cap leaves existing provider defaults unchanged',async()=>{
 const original=globalThis.fetch,bodies:Record<string,any>[]=[];
 globalThis.fetch=async(_url,init)=>{bodies.push(JSON.parse(String(init?.body)));return new Response(JSON.stringify({message:{content:'{}'},choices:[{message:{content:'{}'}}]}));};
 try{
  const {provider}=await import('../server/provider');
  await provider(()=>undefined).json('test',{}, {},()=>true);
  await provider(()=>undefined,160).json('test',{}, {},()=>true);
  const env=(key:string)=>({MODEL_PROVIDER:'hosted',HOSTED_MODEL_KEY:'test',HOSTED_MODEL_URL:'https://example.invalid',HOSTED_MODEL_NAME:'test'}[key]);
  await provider(env).json('test',{}, {},()=>true);await provider(env,160).json('test',{}, {},()=>true);
  assert.equal(bodies[0].options.num_predict,600);assert.equal(bodies[1].options.num_predict,160);
  assert.equal(bodies[2].max_tokens,1200);assert.equal(bodies[3].max_tokens,160);
 }finally{globalThis.fetch=original;}
});
test('forgetting personal data erases omen text without granting a second request that day',async()=>{
 const {forgetOmen}=await import('../src/daily-omen');
 const values=new Map<string,string>([[omenKey,JSON.stringify({day:localDay(),text:'Private personal omen.'})]]);
 const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value)}};
 await forgetOmen(storage);
 const result=await loadDailyOmen(storage,{},async()=>{throw new Error('Must not generate twice today')});
 assert.equal(result.text,null);assert.equal(JSON.parse(values.get(omenKey)!).text,null);
});

test('forget serializes overlapping cache reads and writes without exposing old text',async()=>{
 const {forgetOmen}=await import('../src/daily-omen');
 for(const phase of ['cache read','erase','generated write'] as const){
  invalidateOmen();
  let value=phase==='generated write'?null:JSON.stringify({day:localDay(),text:'Private old omen'});
  let release!:()=>void,entered!:()=>void;
  const blocked=new Promise<void>(resolve=>{release=resolve});
  const started=new Promise<void>(resolve=>{entered=resolve});
  let paused=false,calls=0;
  const storage={
   getItem:async()=>{const snapshot=value;if(!paused&&phase==='cache read'){paused=true;entered();await blocked;}return snapshot;},
   setItem:async(_key:string,next:string)=>{
    if(!paused&&((phase==='erase'&&JSON.parse(next).text===null)||(phase==='generated write'&&JSON.parse(next).text!==null))){paused=true;entered();await blocked;}
    value=next;
   },
  };
  const generate=async()=>{calls++;return 'Private old omen'};
  const first=phase==='erase'?undefined:loadDailyOmen(storage,{},generate);
  if(first)await started;
  const erasing=forgetOmen(storage);
  if(!first)await started;
  const returningHome=loadDailyOmen(storage,{},generate);
  release();
  await erasing;
  if(first)assert.equal((await first).text,null,phase);
  assert.equal((await returningHome).text,null,phase);
  assert.equal(JSON.parse(value!).text,null,phase);
  assert.equal(calls,phase==='generated write'?1:0,phase);
 }
});

test('durable omen erasure rejects failed writes and completes only after retry is stored',async()=>{
 const {forgetOmen}=await import('../src/daily-omen');
 let value=JSON.stringify({day:localDay(),text:'Private personal omen.'}),fail=true;
 let release!:()=>void,entered!:()=>void,done=false;
 const gate=new Promise<void>(resolve=>{release=resolve}),started=new Promise<void>(resolve=>{entered=resolve});
 const storage={getItem:async()=>value,setItem:async(_key:string,next:string)=>{
  if(fail)throw new Error('Storage unavailable');
  entered();await gate;value=next;
 }};
 await assert.rejects(forgetOmen(storage),/Storage unavailable/);
 assert.equal(JSON.parse(value).text,'Private personal omen.');
 fail=false;
 const retry=forgetOmen(storage).then(()=>{done=true});
 await started;assert.equal(done,false);assert.equal(JSON.parse(value).text,'Private personal omen.');
 release();await retry;assert.equal(done,true);assert.equal(JSON.parse(value).text,null);
 const cached=await loadDailyOmen(storage,{},async()=>{throw new Error('Must preserve daily claim')});
 assert.equal(cached.text,null);
});
