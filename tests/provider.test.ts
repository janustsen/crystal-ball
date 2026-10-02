import test from 'node:test';
import assert from 'node:assert/strict';
import {provider,type JsonSchema} from '../server/provider.ts';
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
test('social inference requires current provider consent while profile sync stays available',async t=>{
 const {handler}=await import('../server/handler.ts');
 const env:Record<string,string>={MODEL_PROVIDER:'hosted',HOSTED_MODEL_DISCLOSURE:'Candidate AI',SUPABASE_URL:'http://supabase.local',SUPABASE_SERVICE_ROLE_KEY:'test-only'};
 let calls=0;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=String(input);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'viewer'});
  if(url.includes('/social_profiles?'))return Response.json([{age_band:'adult'}]);
  if(url.endsWith('/rpc/sync_social_profile'))return Response.json({});
  if(url.endsWith('/rpc/authorize_friend_reading'))return Response.json({sun_sign:'leo',themes:['growth']});
  if(url.endsWith('/social_drafts'))return Response.json([{id:'draft',...JSON.parse(String(init?.body))}]);
  throw new Error(`Unexpected URL: ${url}`);
 });
 const serve=handler(k=>env[k],{async json<T>(_system:string,_input:unknown,schema:JsonSchema){
  calls++;
  const fields=schema.properties as Record<string,unknown>;
  return ('safe' in fields?{safe:true}:'wording' in fields?{wording:'Will a creative opportunity arrive?',theme:'growth'}:'headline' in fields?{headline:'A creative opportunity may arrive.',why:'A playful nudge from a sun sign and shared themes.'}:{category:'allow'}) as T;
 }});
 const send=(body:unknown)=>serve(new Request('http://localhost/social',{method:'POST',headers:{Authorization:'Bearer test-only'},body:JSON.stringify(body)}));
 const actions=[{action:'draft',kind:'star',text:'Will I find a creative opportunity?'},{action:'draft',kind:'seal',text:'A creative opportunity may arrive.'},{action:'friend',firstName:'Alex',question:'What lies ahead for Alex?',circle:'circle',member:'member'}];
 for(const action of actions){
  for(const aiConsent of [undefined,'','Other AI',true]){
   const before=calls,response=await send({...action,aiConsent});
   assert.equal(response.status,400);assert.match((await response.json()).message,/allow sharing/);assert.equal(calls,before);
  }
  const before=calls,response=await send({...action,aiConsent:'Candidate AI'});
  assert.equal(response.status,200,await response.clone().text());assert.ok(calls>before);
  const after=calls;
  assert.equal((await send({...action,aiConsent:''})).status,400);assert.equal(calls,after);
 }
 const before=calls;
 assert.equal((await send({action:'profile',ageBand:'adult',sunSign:'leo',plus:false})).status,200);assert.equal(calls,before);
 delete env.HOSTED_MODEL_DISCLOSURE;
 for(const action of actions)assert.equal((await send({...action,aiConsent:'Candidate AI'})).status,400);
 assert.equal(calls,before);
 env.MODEL_PROVIDER='ollama';
 for(const action of actions)assert.equal((await send(action)).status,200);
 assert.ok(calls>before);
});
