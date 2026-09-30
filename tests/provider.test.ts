import test from 'node:test';
import assert from 'node:assert/strict';
import {provider} from '../server/provider.ts';
const schema={type:'object',properties:{ok:{type:'boolean'}},required:['ok'],additionalProperties:false};
test('both transports repair once and fail closed, without changing the engine contract',async()=>{
 const original=globalThis.fetch;
 try {for(const hosted of [false,true])for(const format of ['json_schema','json_object']) {
  const config:Record<string,string>=hosted?{MODEL_PROVIDER:'hosted',HOSTED_MODEL_URL:'https://example.invalid/v1/',HOSTED_MODEL_NAME:'candidate',HOSTED_MODEL_KEY:'test-only',HOSTED_MODEL_FORMAT:format}:{};
  const calls:{url:string;body:any;headers:any}[]=[];
  let outputs=['{"ok":false}','{"ok":true}'];
  globalThis.fetch=async(url,init)=>{calls.push({url:String(url),body:JSON.parse(String(init?.body)),headers:init?.headers});const content=outputs.shift();return Response.json(hosted?{choices:[{message:{content}}]}:{message:{content}})};
  const model=provider(k=>config[k]);
  assert.deepEqual(await model.json('Oracle',{},schema,x=>({valid:!!(x as any)?.ok,feedback:'ok must be true'})),{ok:true});
  assert.equal(calls.length,2);assert.match(calls[1].body.messages.at(-1).content,/ok must be true/);
  assert.equal(calls[0].url,hosted?'https://example.invalid/v1/chat/completions':'http://127.0.0.1:11435/api/chat');
  assert.equal(calls[0].headers.Authorization,hosted?'Bearer test-only':undefined);
  if(hosted)assert.equal(calls[0].body.response_format.type,format);
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
