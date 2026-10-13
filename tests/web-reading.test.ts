import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {webReadings} from '../server/web-reading.ts';
import {markWebReadingVisitor,webReadingVisitor,spendWebReading} from '../src/api.ts';
import {handler} from '../server/handler.ts';
import {sha256,solveProof,validProof,webReadingUsed,webNetworkUsed,webReadingsResting} from '../src/web-reading.ts';

const browsers=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
// Solved once: each proof costs ~65k hashes.
const solved=Promise.all(browsers.map(id=>solveProof(id)));
const proofFor=async(i:number)=>(await solved)[i];
const ask=async(webReading:unknown,ip:string,authorization?:string)=>new Request('http://localhost/',{method:'POST',headers:{'x-forwarded-for':`${ip}, 10.0.0.1`,...authorization?{authorization}:{}},body:JSON.stringify({action:'predict',question:'Will I finish my course?',facts:{context_1:'Daily practice',horizon:'next month'},ageConfirmed:true,webReading})});

// A fake Ollama (and optional Supabase) boundary; `fail` makes the forecast model throw.
function boundary(t:any,supabase?:(path:string,body:any)=>unknown){
 const calls:{path:string;body:any}[]=[];const state={models:0,fail:false};
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=new URL(String(input)),body=init?.body?JSON.parse(String(init.body)):null;
  if(body?.messages){
   if(state.fail&&body.format.properties.prediction)return new Response('down',{status:500});
   state.models++;
   return Response.json({message:{content:JSON.stringify(body.format.properties.prediction?{prediction:'You will make progress.',basis:'context_1',insight:'Practice continues.'}:{category:'allow'})}});
  }
  calls.push({path:url.pathname,body});
  if(supabase)return Response.json(supabase(url.pathname,body));
  throw new Error(`Unexpected URL: ${url}`);
 });
 return {calls,state};
}

test('pure SHA-256 matches node crypto across padding boundaries, so the browser and server agree on proofs',async()=>{
 for(const text of ['','abc','a'.repeat(55),'a'.repeat(56),'a'.repeat(64),'b'.repeat(200),'ünicode ✧ 星'])assert.equal(sha256(text),createHash('sha256').update(text).digest('hex'));
 const proof=await proofFor(0);
 assert.ok(validProof(proof));
 const digest=createHash('sha256').update(`${proof.browser}:${proof.day}:${proof.nonce}`).digest();
 assert.deepEqual([digest[0],digest[1]],[0,0]);
});

test('a web reading without a valid bot check is refused before any model call',async t=>{
 const b=boundary(t),serve=handler(()=>undefined),proof=await proofFor(0);
 for(const bad of [null,{},{...proof,nonce:'nope'},{...proof,day:'2020-01-01'},{...proof,browser:'not-a-uuid'}]){
  const response=await serve(await ask(bad,'203.0.113.1'));
  assert.equal(response.status,400);
 }
 assert.equal(b.state.models,0);
});

test('one free web reading per browser, per network per day, under a global daily cap; failures give it back',async t=>{
 const b=boundary(t),serve=handler(k=>({WEB_READING_DAILY_CAP:'2'} as Record<string,string>)[k]);
 const proofs=await solved;
 const first=await serve(await ask(proofs[0],'203.0.113.1'));
 assert.equal(first.status,200);assert.equal((await first.json()).kind,'ok');
 const again=await serve(await ask(proofs[0],'198.51.100.7'));
 assert.equal(again.status,429);assert.equal((await again.json()).message,webReadingUsed);
 const sameNetwork=await serve(await ask(proofs[1],'203.0.113.1'));
 assert.equal(sameNetwork.status,429);assert.equal((await sameNetwork.json()).message,webNetworkUsed);
 b.state.fail=true;
 const failed=await serve(await ask(proofs[1],'198.51.100.7'));
 assert.notEqual((await failed.json()).kind,'ok');
 b.state.fail=false;
 const retried=await serve(await ask(proofs[1],'198.51.100.7'));
 assert.equal((await retried.json()).kind,'ok','a failed forecast must not use the visitor’s reading');
 const capped=await serve(await ask(proofs[2],'192.0.2.9'));
 assert.equal(capped.status,429);assert.equal((await capped.json()).message,webReadingsResting);
});

test('with Supabase, claims go through the service RPC with a hashed network and never touch account billing',async t=>{
 const claims:any[]=[];
 const b=boundary(t,(path,body)=>{if(path.endsWith('/claim_web_reading')){claims.push(body);return {outcome:body.browser===browsers[1]?'network':'ok',day:'2026-10-05',expires_at:'2026-10-05T00:10:00Z'}}return path.endsWith('/complete_web_reading')?true:null});
 const serve=handler(k=>({SUPABASE_URL:'http://127.0.0.1:55321',SUPABASE_SERVICE_ROLE_KEY:'test-only'} as Record<string,string>)[k]);
 const ok=await serve(await ask(await proofFor(0),'203.0.113.1','Bearer user-token'));
 assert.equal((await ok.json()).kind,'ok');
 assert.equal(claims[0].browser,browsers[0]);assert.equal(claims[0].daily_cap,500);
 assert.match(claims[0].network,/^[0-9a-f]{64}$/);assert.ok(!JSON.stringify(claims).includes('203.0.113.1'));
 const refused=await serve(await ask(await proofFor(1),'203.0.113.1'));
 assert.equal(refused.status,429);
 b.state.fail=true;
 const failed=await serve(await ask(await proofFor(2),'192.0.2.9'));
 assert.notEqual((await failed.json()).kind,'ok');
 assert.deepEqual(b.calls.filter(c=>c.path.endsWith('/release_web_reading')).map(c=>c.body.browser),[browsers[2]]);
 assert.equal(b.calls.find(c=>c.path.endsWith('/release_web_reading'))?.body.day,'2026-10-05');
 assert.ok(!b.calls.some(c=>/auth\/v1\/user|reading_balance|reading_charges|charge_reading/.test(c.path)));
});

 test('releasing yesterday preserves today’s network reservation',async t=>{
 const proofs=await solved,day=proofs[0].day;
 t.mock.method(Date,'now',()=>Date.parse(day+'T23:59:59Z'));
 const meter=webReadings(()=>undefined),req=await ask(proofs[0],'203.0.113.1');
 const old=await meter.claim(req,proofs[0]);
 t.mock.method(Date,'now',()=>Date.parse(day+'T23:59:59Z')+2000);
 const current=await meter.claim(req,proofs[1]);
 await meter.release(old);
 await assert.rejects(meter.claim(req,proofs[2]),new RegExp(webNetworkUsed));
 const retried=await meter.claim(await ask(proofs[0],'192.0.2.1'),proofs[0]);
 assert.notEqual(retried.day,old.day);
 await meter.release(old);
 await assert.rejects(meter.claim(await ask(proofs[0],'192.0.2.2'),proofs[0]),new RegExp(webReadingUsed));
 await meter.release(current);
 await meter.claim(req,proofs[2]);
});

 test('persistent visitor context routes requests through proof after navigation and reload',async t=>{
 const storage=new Map<string,string>([['cb.web-browser',browsers[0]]]);
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage')});
 markWebReadingVisitor();
 assert.equal(webReadingVisitor(),true);
 spendWebReading();
 const calls:any[]=[];
 t.mock.method(globalThis,'fetch',async(_input:unknown,init?:RequestInit)=>{calls.push(init);return Response.json({kind:'error',message:webReadingUsed})});
 const reloaded=await import('../src/api.ts');
 assert.equal(reloaded.webReadingVisitor(),true);
 await reloaded.request('predict','Will I learn?',{},false,new AbortController().signal);
 const body=JSON.parse(calls[0].body);
 assert.equal(body.webReading.browser,browsers[0]);
 assert.ok(validProof(body.webReading));
 assert.equal(calls[0].headers.authorization,undefined);
});

 test('pending reservations expire after ten minutes while completed readings stay consumed',async t=>{
 const proofs=await solved;let now=Date.parse(proofs[0].day+'T12:00:00Z');
 t.mock.method(Date,'now',()=>now);
 const meter=webReadings(key=>key==='WEB_READING_DAILY_CAP'?'1':undefined);
 const req=await ask(proofs[0],'203.0.113.1'),other=await ask(proofs[1],'192.0.2.1');
 const abandoned=await meter.claim(req,proofs[0]);
 now+=599_999;
 await assert.rejects(meter.claim(req,proofs[0]),new RegExp(webReadingUsed));
 await assert.rejects(meter.claim(req,proofs[1]),new RegExp(webNetworkUsed));
 await assert.rejects(meter.claim(other,proofs[1]),new RegExp(webReadingsResting));
 now++;
 const replacement=await meter.claim(req,proofs[0]);
 await meter.release(abandoned);
 await assert.rejects(meter.complete(abandoned),/expired/);
 await assert.rejects(meter.claim(req,proofs[1]),new RegExp(webNetworkUsed));
 await meter.complete(replacement);
 await meter.release(replacement);
 now+=600_000;
 await assert.rejects(meter.claim(req,proofs[0]),new RegExp(webReadingUsed));
 await assert.rejects(meter.claim(req,proofs[1]),new RegExp(webNetworkUsed));
 await assert.rejects(meter.claim(other,proofs[1]),new RegExp(webReadingsResting));
});

test('free web readings receive Free editions even when the request claims Plus',async t=>{
 boundary(t);
 let id='00000032-0000-4000-8000-000000000001' as `${string}-${string}-${string}-${string}-${string}`;
 t.mock.method(crypto,'randomUUID',()=>id);
 for(const [prefix,golden] of [['00000032',true],['0000000a',false],['00000033',false]] as const){
  id=`${prefix}-0000-4000-8000-000000000001`;
  const original=await ask(await proofFor(0),'203.0.113.1');
  const request=new Request(original.url,{method:'POST',headers:original.headers,body:JSON.stringify({...await original.json(),plus:true})});
  const response=await handler(()=>undefined)(request),result=await response.json();
  assert.equal(response.status,200);
  assert.equal(result.kind,'ok');
  assert.equal(result.value.id,id);
  assert.equal(result.value.golden,golden);
 }
});
