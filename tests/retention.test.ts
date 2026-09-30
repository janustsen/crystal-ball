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
 const ports:NativePorts={platform:'ios',notifications:{permission:async()=>true,schedule:async(...args)=>{scheduled.push(args)}},apple:{available:async()=>false,enabled:false,owner:async()=>null,signIn:async()=>null,link:async()=>undefined},share:async()=>{},link:()=>''};
 const on=localDay(new Date(Date.now()+86400000*5));
 const before=Date.now();
 assert.match(await nativeActions(ports).reminder(reading.headline,reading.id,on),/reminder set/);
 assert.equal(scheduled[0][0],'Did it come true?');assert.equal(scheduled[0][3],reading.id);
 assert.ok(Math.abs(Number(scheduled[0][2])-((checkInDate(on)!.getTime()-before)/1000))<2);
 await nativeActions(ports).reminder('',reading.id,'2026-02-30');assert.equal(scheduled.length,1);
 assert.match(await nativeActions(ports).reminder('',reading.id,'2000-01-01'),/ready for a Check-in/);assert.equal(scheduled.length,1);
 ports.platform='web';assert.match(await nativeActions(ports).reminder('',reading.id,on),/Native reminder preview/);assert.equal(scheduled.length,1);
});

import {loadDailyOmen,invalidateOmen,omenKey} from '../src/daily-omen';
import {handler} from '../server/handler';
test('personal omen claims each local day before generation, caches failures and coalesces callers',async()=>{
 invalidateOmen();const values=new Map<string,string>();let calls=0;
 const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value)}};
 const facts={sun_sign:'Libra',learning_target:'Spanish'};
 const generate=async(input:Record<string,string>)=>{calls++;assert.deepEqual(input,facts);assert.equal(JSON.parse(values.get(omenKey)!).text,null);return 'Libra, let a new Spanish word be your little constellation today.'};
 const today=new Date(2026,8,30,10);
 const [first,second]=await Promise.all([loadDailyOmen(storage,facts,generate,today),loadDailyOmen(storage,facts,generate,today)]);
 assert.deepEqual(first,second);assert.equal(calls,1);
 assert.deepEqual(await loadDailyOmen(storage,{},async()=>{throw new Error('must not regenerate')},today),first);
 const tomorrow=new Date(2026,9,1);
 const failed=await loadDailyOmen(storage,facts,async()=>{calls++;throw new Error('offline')},tomorrow);assert.equal(failed.text,null);
 await loadDailyOmen(storage,facts,generate,tomorrow);assert.equal(calls,2);
 invalidateOmen();await loadDailyOmen(storage,facts,generate,tomorrow);assert.equal(calls,2,'reload retains the claimed day');
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
  const response=await serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'omen',question:'Today’s personal omen',facts:{sun_sign:'Libra',learning_target:'Spanish'}})}));
  assert.equal(response.status,200);assert.equal((await response.json()).kind,'ok');assert.equal(calls,1);
  const invalid=await serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'omen',question:'Today’s personal omen',facts:{sun_sign:100}})}));assert.equal(invalid.status,400);assert.equal(calls,1);
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
  assert.equal('max_tokens'in bodies[2],false);assert.equal(bodies[3].max_tokens,160);
 }finally{globalThis.fetch=original;}
});
