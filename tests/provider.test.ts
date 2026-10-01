import test from 'node:test';
import assert from 'node:assert/strict';
import {provider} from '../server/provider.ts';
const schema={type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false};
test('both transports repair once and fail closed, without changing the engine contract',async()=>{
 const original=globalThis.fetch;
 try {for(const hosted of [false,true]) {
  const config:Record<string,string>=hosted?{MODEL_PROVIDER:'hosted',HOSTED_MODEL_URL:'https://example.invalid/v1/',HOSTED_MODEL_NAME:'candidate',HOSTED_MODEL_KEY:'test-only'}:{};
  const calls:{url:string;body:any;headers:any}[]=[];
  let outputs=['{"ok":false}','{"ok":true}'];
  globalThis.fetch=async(url,init)=>{calls.push({url:String(url),body:JSON.parse(String(init?.body)),headers:init?.headers});const content=outputs.shift();return Response.json(hosted?{choices:[{message:{content}}]}:{message:{content}})};
  const model=provider(k=>config[k]);
  assert.deepEqual(await model.json('Oracle',{},schema,x=>({valid:!!(x as any)?.ok,feedback:'ok must be true'})),{ok:true});
  assert.equal(calls.length,2);assert.match(calls[1].body.messages.at(-1).content,/ok must be true/);
  assert.equal(calls[0].url,hosted?'https://example.invalid/v1/chat/completions':'http://127.0.0.1:11435/api/chat');
  assert.equal(calls[0].headers.Authorization,hosted?'Bearer test-only':undefined);
  if(hosted)assert.deepEqual(calls[0].body.response_format,{type:'json_schema',json_schema:{name:'result',strict:true,schema}});
  outputs=['bad','bad'];calls.length=0;
  await assert.rejects(model.json('Oracle',{},schema,()=>false),/mist/);assert.equal(calls.length,2);
 }}finally{globalThis.fetch=original}
});
test('hosted config and upstream errors do not leak credentials or silently fall back',async()=>{
 assert.throws(()=>provider(()=> 'typo'),/Unknown/);
 await assert.rejects(provider(k=>k==='MODEL_PROVIDER'?'hosted':undefined).json('',{},schema,()=>true),/configured/);
 const env:Record<string,string>={MODEL_PROVIDER:'hosted',HOSTED_MODEL_KEY:'secret',HOSTED_MODEL_NAME:'model',HOSTED_MODEL_URL:'http://example.invalid'};
 await assert.rejects(provider(k=>env[k]).json('',{},schema,()=>true),/HTTPS/);
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('secret',{status:429})};
 try{env.HOSTED_MODEL_URL='https://example.invalid';await assert.rejects(provider(k=>env[k]).json('',{},schema,()=>true),/^Error: Model unavailable \(429\)\.$/);assert.equal(calls,1)}finally{globalThis.fetch=original}
});
test('hosted API rejects absent or outdated consent before any model call',async()=>{
 const {handler}=await import('../server/handler.ts');
 const env:Record<string,string>={MODEL_PROVIDER:'hosted',HOSTED_MODEL_DISCLOSURE:'Candidate AI'};
 const serve=handler(k=>env[k]);
 for(const action of ['plan','predict','omen'])for(const aiConsent of [undefined,'Other AI']){
  const response=await serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action,question:'Will I learn Spanish?',facts:{},aiConsent})}));
  assert.equal(response.status,400);assert.match((await response.json()).message,/allow sharing/);
 }
});
