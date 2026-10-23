import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {provider} from '../server/provider.ts';

for(const transport of ['cloudflare','deepinfra'])test(`${transport} observes shared and caller cancellation before reservations, during fetch, and across repair`,async t=>{
 const config:Record<string,string>={MODEL_PROVIDER:'hosted',CLOUDFLARE_QUALITY_APPROVED:String(transport==='cloudflare'),CLOUDFLARE_WORKERS_PLAN:'free',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_API_TOKEN:'fixture',DEEPINFRA_QUALITY_APPROVED:'true',DEEPINFRA_API_KEY:'fixture'};
 let reservations=0,calls=0,admissions=0;
 let onReserve=()=>{},onFetch:(signal:AbortSignal)=>Promise<Response>;
 const accounting={admit:async()=>{admissions++},reserveFree:async()=>{reservations++;onReserve();return 'free'},settleFree:async()=>{},reserve:async()=>{reservations++;onReserve();return 'paid'},settle:async()=>{}};
 t.mock.method(globalThis,'fetch',async(_url:unknown,init?:RequestInit)=>{calls++;return onFetch(init!.signal!)});
 const expired=new AbortController();expired.abort(Error('shared deadline'));
 await assert.rejects(provider(k=>config[k],undefined,45000,accounting,expired.signal).json('',{}, {},()=>true),/shared deadline/);
 assert.equal(admissions,0);assert.equal(reservations,0);
 const duringReserve=new AbortController();onReserve=()=>duringReserve.abort(Error('reservation deadline'));
 await assert.rejects(provider(k=>config[k],undefined,45000,accounting,duringReserve.signal).json('',{}, {},()=>true),/reservation deadline/);
 assert.equal(calls,0);onReserve=()=>{};
 for(const source of ['deadline','caller']){
  const deadline=new AbortController(),caller=new AbortController();
  onFetch=signal=>new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});(source==='deadline'?deadline:caller).abort(Error(`${source} stopped fetch`))});
  await assert.rejects(provider(k=>config[k],undefined,45000,accounting,deadline.signal).json('',{}, {},()=>true,caller.signal),/stopped fetch/);
 }
 const shared=new AbortController();
 onFetch=async()=>Response.json(transport==='cloudflare'?{success:true,result:{response:'{"ok":true}',usage:{}}}:{choices:[{message:{content:'{"ok":true}'}}],usage:{}});
 const model=provider(k=>config[k],undefined,45000,accounting,shared.signal);
 assert.deepEqual(await model.json('',{}, {},()=>true),{ok:true});
 const before=calls;
 await assert.rejects(model.json('',{}, {},()=>{shared.abort(Error('repair deadline'));return false}),/repair deadline/);
 assert.equal(calls,before+1);
 await assert.rejects(model.json('next moderation stage',{}, {},()=>true),/repair deadline/);
 assert.equal(calls,before+1);
});

test('engine requests use explicit override or platform development endpoint regardless of Supabase URL',async()=>{
 const code=ts.transpileModule(readFileSync(new URL('../src/api.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const browser of [false,true])for(const supabase of ['', 'http://127.0.0.1:55321'])for(const override of ['', 'https://example.invalid/functions/v1/predict']){
  const module={exports:{} as any},urls:string[]=[];
  runInNewContext(code,{module,exports:module.exports,require:(name:string)=>name==='./retention'?{localDay:()=> '2026-10-23'}:name==='./cloud'?{authorization:async()=>({})}:{},process:{env:{EXPO_PUBLIC_ENGINE_URL:override,EXPO_PUBLIC_SUPABASE_URL:supabase,EXPO_PUBLIC_SUPABASE_ANON_KEY:'fixture'}},...(browser?{window:{location:{protocol:'http:',origin:'http://localhost:8095'}}}:{}),fetch:async(url:string)=>{urls.push(url);return {json:async()=>({kind:'ok'})}}});
  const expected=override||(browser?'http://localhost:8095/engine':'http://127.0.0.1:8787');
  assert.equal(module.exports.engineUrl,expected);
  await module.exports.request('plan','question',{},false,new AbortController().signal);
  assert.deepEqual(urls,[expected]);
 }
});

test('published privacy HTML discloses both processors and their data-use references',()=>{
 const html=readFileSync(new URL('../public/privacy/index.html',import.meta.url),'utf8');
 const section=html.match(/<section><h2>AI providers<\/h2>([\s\S]*?)<\/section>/)?.[1];
 assert.ok(section,'Published privacy HTML must contain the AI providers section');
 assert.match(section,/Cloudflare, Inc/);
 assert.match(section,/DeepInfra, Inc/);
 assert.match(section,/When the free allowance cannot admit a request/);
 assert.match(section,/<a href="https:\/\/developers\.cloudflare\.com\/workers-ai\/platform\/data-usage\/">Cloudflare data usage<\/a>/);
 assert.match(section,/<a href="https:\/\/docs\.deepinfra\.com\/account\/data-privacy">DeepInfra data privacy<\/a>/);
});
