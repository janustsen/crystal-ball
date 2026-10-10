import test from 'node:test';
import assert from 'node:assert/strict';
import {checkInDate,localDay,suggestedCheckIn} from '../src/retention';
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
import {loadDailyOmen,invalidateOmen,omenKey,type OmenReply} from '../src/daily-omen';
import {handler} from '../server/handler';
test('personal omen claims each local day before generation, caches failures and coalesces callers',async()=>{
 invalidateOmen();const values=new Map<string,string>();let calls=0;
 const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value)}};
 const facts={sun_sign:'Libra',learning_target:'Spanish'};
 const generate=async(input:Record<string,string>)=>{calls++;assert.deepEqual(input,facts);assert.equal(JSON.parse(values.get(omenKey)!).text,null);return {text:'Libra, let a new Spanish word be your little constellation today.',whisper:'By tonight, a small plan may change for the better.'}};
 const today=new Date(2026,8,30,10);
 const [first,second]=await Promise.all([loadDailyOmen(storage,facts,generate,()=>today),loadDailyOmen(storage,facts,generate,()=>today)]);
 assert.deepEqual(first,second);assert.equal(calls,1);
 assert.deepEqual(await loadDailyOmen(storage,{},async()=>{throw new Error('must not regenerate')},()=>today),first);
 const tomorrow=new Date(2026,9,1);
 const failed=await loadDailyOmen(storage,facts,async()=>{calls++;throw new Error('offline')},()=>tomorrow);assert.equal(failed.text,null);assert.equal(failed.tries,1);
 const retried=await loadDailyOmen(storage,facts,async()=>{calls++;throw new Error('still offline')},()=>tomorrow);assert.equal(retried.tries,2);assert.equal(calls,3,'one retry after a failure');
 await loadDailyOmen(storage,facts,generate,()=>tomorrow);assert.equal(calls,3,'the retry is bounded');
 invalidateOmen();await loadDailyOmen(storage,facts,generate,()=>tomorrow);assert.equal(calls,3,'reload retains the claimed day');
});
test('a failed or interrupted omen gets one retry that can bring the whisper',async()=>{
 const today=new Date(2026,9,4,9),day='2026-10-04';
 for(const claim of [{day,text:null},{day,text:null,tries:1}]){
  invalidateOmen();let calls=0;
  const values=new Map([[omenKey,JSON.stringify(claim)]]);
  const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value)}};
  const generate=async()=>{calls++;assert.equal(JSON.parse(values.get(omenKey)!).tries,2,'the retry is claimed before inference');return {text:'A small door opens today.',whisper:'By tonight, a plan may turn out simpler than it looked.'}};
  assert.deepEqual(await loadDailyOmen(storage,{},generate,()=>today),{day,text:'A small door opens today.',whisper:'By tonight, a plan may turn out simpler than it looked.',tries:2});
  await loadDailyOmen(storage,{},generate,()=>today);assert.equal(calls,1);
 }
 invalidateOmen();
 const spent=new Map([[omenKey,JSON.stringify({day,text:null,tries:2})]]);
 const result=await loadDailyOmen({getItem:async(key:string)=>spent.get(key)??null,setItem:async()=>assert.fail('a spent day must not claim again')},{},async()=>assert.fail('a spent day must not generate'),()=>today);
 assert.equal(result.text,null);assert.equal(result.tries,2);
});
test('reset during generation prevents a private omen from being saved after reset',async()=>{
 invalidateOmen();const values=new Map<string,string>();let finish!:(reply:OmenReply)=>void;
 const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value)}};
 const call=loadDailyOmen(storage,{},()=>new Promise(resolve=>{finish=resolve}));
 while(!finish)await new Promise(resolve=>setTimeout(resolve,0));
 invalidateOmen();values.clear();finish({text:'Private old omen',whisper:'By tonight, a small plan may change for the better.'});assert.equal((await call).text,null);assert.equal(values.size,0);
});
test('omen endpoint shares input limits and forwards Sun sign and facts to the real generator',async()=>{
 const fetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body));assert.equal(body.options.num_predict,160);assert.deepEqual(JSON.parse(body.messages[1].content).facts,{sun_sign:'Libra',learning_target:'Spanish'});return new Response(JSON.stringify({message:{content:JSON.stringify({text:'Libra, a new Spanish word may brighten your constellation today.',whisper:'By tonight, a small plan may change for the better.'})}}));};
 try{
  const serve=handler(()=>undefined);
  const response=await serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'omen',ageConfirmed:true,question:'Today’s personal omen',facts:{sun_sign:'Libra',learning_target:'Spanish'}})}));
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{kind:'ok',value:{text:'Libra, a new Spanish word may brighten your constellation today.',whisper:'By tonight, a small plan may change for the better.'}});assert.equal(calls,1);
  const invalid=await serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'omen',ageConfirmed:true,question:'Today’s personal omen',facts:{sun_sign:100}})}));assert.equal(invalid.status,400);assert.equal(calls,1);
 }finally{globalThis.fetch=fetch;}
});
test('omen repairs invented signs and clipped sentences once, then fails closed',async()=>{
 const fetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({message:{content:JSON.stringify({text:calls===1?'Pisces, follow a gentle light.':'A little starlight invites a fresh beginning.',whisper:'By tonight, a kind message may find its way to you.'})}}));};
 try{
  const {personalOmen}=await import('../server/omen');const {provider}=await import('../server/provider');
  assert.deepEqual(await personalOmen({},provider(()=>undefined,160)),{text:'A little starlight invites a fresh beginning.',whisper:'By tonight, a kind message may find its way to you.'});assert.equal(calls,2);
  calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({message:{content:'{"text":"A gentle light reminds you to follow your h"}'}}));};
  await assert.rejects(personalOmen({},provider(()=>undefined,160)));assert.equal(calls,2);
  const whispers=['Tonight you will definitely meet someone.','By tonight, Leo, a plan may shift.','By tonight, you are definitely going to get good news.','By tonight, a small plan may change for the better.'];
  calls=0;globalThis.fetch=async()=>{const whisper=whispers[calls++];return new Response(JSON.stringify({message:{content:JSON.stringify({text:'A little starlight invites a fresh beginning.',whisper})}}));};
  await assert.rejects(personalOmen({},provider(()=>undefined,160)));assert.equal(calls,2,'an unrepaired whisper fails the omen closed');
  assert.equal((await personalOmen({},provider(()=>undefined,160))).whisper,whispers[3]);assert.equal(calls,4,'certainty is repaired once');
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
  const generate=async()=>{calls++;return {text:'Private old omen',whisper:'By tonight, a small plan may change for the better.'}};
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

test('whispers outside character bounds repair once or fail closed before publication',async()=>{
 const original=globalThis.fetch;
 const {personalOmen}=await import('../server/omen');const {provider}=await import('../server/provider');
 const long='By tonight, reorganizing your workspace may unexpectedly simplify several complicated responsibilities and make tomorrow feel wonderfully manageable.';
 const valid='By tonight, a small plan may change for the better.';
 try{
  for(const invalid of [long,'By tonight,a b c d.'])for(const repaired of [true,false]){
   let calls=0;
   globalThis.fetch=async()=>new Response(JSON.stringify({message:{content:JSON.stringify({text:'A little starlight invites a fresh beginning.',whisper:++calls===2&&repaired?valid:invalid})}}));
   if(repaired)assert.equal((await personalOmen({},provider(()=>undefined,160))).whisper,valid);
   else await assert.rejects(personalOmen({},provider(()=>undefined,160)));
   assert.equal(calls,2);
  }
 }finally{globalThis.fetch=original;}
});
