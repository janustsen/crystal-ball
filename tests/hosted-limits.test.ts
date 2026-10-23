import {hostedConsent} from '../src/ai-policy.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {deepinfra,hostedAccounting,publicHandler,reservationCost,usageCost,budgetMessage,quotaMessage} from '../server/hosted-limits.ts';
import {provider} from '../server/provider.ts';

const config:Record<string,string>={MODEL_PROVIDER:'hosted',DEEPINFRA_API_KEY:'synthetic-key',HOSTED_MODEL_DISCLOSURE:hostedConsent,DEEPINFRA_QUALITY_APPROVED:'true',SUPABASE_URL:'https://supabase.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service'};
const env=(key:string)=>config[key];
const body=JSON.stringify({model:deepinfra.model,max_tokens:1200});
test('the reservation covers the full model context and capped output, at priority prices',()=>{
 assert.equal(reservationCost(body),39_591_600);
 assert.equal(usageCost({prompt_tokens:262144,completion_tokens:1200}),reservationCost(body));
 assert.equal(usageCost({prompt_tokens:1000,completion_tokens:100}),172500);
 for(const value of [null,{}, {prompt_tokens:-1,completion_tokens:2},{prompt_tokens:1,completion_tokens:1201},{prompt_tokens:NaN,completion_tokens:1},{prompt_tokens:262145,completion_tokens:1}])assert.equal(usageCost(value),null);
 for(const value of [{model:'other',max_tokens:1200},{model:deepinfra.model,max_tokens:1201},{model:deepinfra.model,max_tokens:0}])assert.throws(()=>reservationCost(JSON.stringify(value)),/budget/);
});
test('every repair reserves before fetch; usage settles once and daily admission happens once',async t=>{
 const calls:string[]=[];let attempts=0;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=String(input),value=JSON.parse(String(init?.body));
  if(url.endsWith('/admit_ai_request')){calls.push('admit');return Response.json(null)}
  if(url.endsWith('/reserve_ai_spend')){calls.push('reserve');assert.equal(value.amount,reservationCost(body));return Response.json(value.reservation)}
  if(url.endsWith('/settle_ai_spend')){calls.push('settle');assert.equal(value.spent,172500);return Response.json(null)}
  assert.equal(url,`${deepinfra.url}/chat/completions`);calls.push('model');attempts++;
  return Response.json({choices:[{message:{content:JSON.stringify({ok:attempts===2})}}],usage:{prompt_tokens:1000,completion_tokens:100}});
 });
 const model=provider(env,undefined,45000,hostedAccounting(env,'viewer','plan'));
 assert.deepEqual(await model.json('test',{}, {},x=>(x as {ok:boolean}).ok),{ok:true});
 assert.deepEqual(calls,['admit','reserve','model','settle','reserve','model','settle']);
});
test('daily and monthly limits refuse the paid fetch; failed transports keep reservations',async t=>{
 let mode='quota',paid=0,settled=0;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=String(input),value=JSON.parse(String(init?.body));
  if(url.endsWith('/admit_ai_request'))return mode==='quota'?Response.json({message:'AI daily quota reached'},{status:400}):Response.json(null);
  if(url.endsWith('/reserve_ai_spend'))return mode==='budget'?Response.json({message:'AI monthly budget reached'},{status:400}):Response.json(value.reservation);
  if(url.endsWith('/settle_ai_spend')){settled++;return Response.json(null)}
  paid++;
  if(mode==='missing')return Response.json({choices:[{message:{content:'{}'}}]});
  throw new Error('network failed');
 });
 const call=()=>provider(env,160,45000,hostedAccounting(env,'viewer','omen')).json('test',{}, {},()=>true);
 await assert.rejects(call(),e=>e instanceof Error&&e.message===quotaMessage);assert.equal(paid,0);
 mode='budget';await assert.rejects(call(),e=>e instanceof Error&&e.message===budgetMessage);assert.equal(paid,0);
 mode='network';await assert.rejects(call(),/network failed/);assert.equal(paid,1);assert.equal(settled,0);
 mode='missing';assert.deepEqual(await call(),{});assert.equal(paid,2);assert.equal(settled,0);
});
test('the public endpoint verifies identity and refuses unapproved quality, missing secrets and wrong vendors',async t=>{
 let paid=0;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  if(String(input).endsWith('/auth/v1/user'))return new Headers(init?.headers).get('authorization')==='Bearer user'?Response.json({id:'viewer'}):Response.json({},{status:401});
  paid++;throw new Error('No provider call expected');
 });
 const request=(token?:string)=>new Request('https://example.invalid/predict',{method:'POST',headers:token?{authorization:token}:{},body:JSON.stringify({action:'plan',question:'Will I learn Spanish?',facts:{},ageConfirmed:true,aiConsent:hostedConsent})});
 assert.equal((await publicHandler(env)(request())).status,401);
 assert.equal((await publicHandler(env)(request('Bearer expired'))).status,401);
 for(const aiConsent of ['', 'Other AI']){
  const req=request('Bearer user'),body=await req.json();
  const response=await publicHandler(env)(new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify({...body,aiConsent})}));
  assert.equal(response.status,400);assert.match((await response.json()).message,/allow sharing/);
 }
 for(const override of [{DEEPINFRA_QUALITY_APPROVED:'false'},{DEEPINFRA_API_KEY:''},{SUPABASE_SERVICE_ROLE_KEY:''},{HOSTED_MODEL_DISCLOSURE:'DeepInfra'},{MODEL_PROVIDER:'ollama'}]){
  const values:Record<string,string|undefined>={...config,...override};assert.equal((await publicHandler(k=>values[k])(request('Bearer user'))).status,503);
 }
 assert.equal(paid,0);
});
test('the public attribution exception cannot call Auth, a model or the spending RPCs',async t=>{
 const calls:string[]=[];
 t.mock.method(globalThis,'fetch',async(input:unknown)=>{
  const url=String(input);calls.push(url);
  assert.ok(url.endsWith('/rpc/count_heard_from'));
  return Response.json(null);
 });
 const response=await publicHandler(env)(new Request('https://example.invalid/predict',{method:'POST',body:JSON.stringify({action:'heard',source:'TikTok',question:'Will I learn Spanish?',aiConsent:hostedConsent})}));
 assert.equal(response.status,200);assert.equal(calls.length,1);
});
test('planning preserves the monthly limit message through the real handler',async t=>{
 t.mock.method(globalThis,'fetch',async(input:unknown)=>{
  const url=String(input);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'viewer'});
  if(url.endsWith('/admit_ai_request'))return Response.json(null);
  if(url.endsWith('/reserve_ai_spend'))return Response.json({message:'AI monthly budget reached'},{status:400});
  throw new Error('Paid fetch must not happen');
 });
 const response=await publicHandler(env)(new Request('https://example.invalid/predict',{method:'POST',headers:{authorization:'Bearer user'},body:JSON.stringify({action:'plan',question:'Will I learn Spanish?',facts:{},ageConfirmed:true,aiConsent:hostedConsent})}));
 assert.equal((await response.json()).message,budgetMessage);
});

test('free first, repair across hosts, no double admission and no repair counter reset',async t=>{
 const values={...config,CLOUDFLARE_QUALITY_APPROVED:'true',CLOUDFLARE_WORKERS_PLAN:'free',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_API_TOKEN:'synthetic-free'};
 const freeEnv=(k:string)=>(values as Record<string,string>)[k];
 const calls:string[]=[];let freeAvailable=true,validPaid=true;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=String(input),value=JSON.parse(String(init?.body));
  if(url.endsWith('/admit_ai_request')){calls.push('admit');return Response.json(null)}
  if(url.endsWith('/reserve_ai_neurons')){calls.push('free-reserve');assert.equal(value.amount,885798000);return Response.json(freeAvailable?value.reservation:null)}
  if(url.endsWith('/settle_ai_neurons')){calls.push('free-settle');assert.equal(value.spent,47148500);return Response.json(null)}
  if(url.endsWith('/reserve_ai_spend')){calls.push('paid-reserve');return Response.json(value.reservation)}
  if(url.endsWith('/settle_ai_spend')){calls.push('paid-settle');return Response.json(null)}
  if(url.includes('api.cloudflare.com')){
   calls.push('free');freeAvailable=false;
   assert.deepEqual(value.response_format,{type:'json_schema',json_schema:{type:'object'}});
   return Response.json({success:true,result:{response:'{"ok":false}',usage:{prompt_tokens:1000,completion_tokens:100}}});
  }
  calls.push('paid');assert.equal(value.model,deepinfra.model);assert.equal(value.messages.length,4);
  return Response.json({choices:[{message:{content:JSON.stringify({ok:validPaid})}}],usage:{prompt_tokens:1000,completion_tokens:100}});
 });
 const call=()=>provider(freeEnv,undefined,45000,hostedAccounting(freeEnv,'viewer','plan')).json('test',{}, {type:'object'},x=>(x as {ok:boolean}).ok);
 assert.deepEqual(await call(),{ok:true});
 assert.deepEqual(calls,['admit','free-reserve','free','free-settle','free-reserve','paid-reserve','paid','paid-settle']);
 calls.length=0;freeAvailable=true;validPaid=false;
 await assert.rejects(call(),/mist is too thick/);
 assert.equal(calls.filter(x=>x==='paid').length,1);assert.equal(calls.filter(x=>x==='admit').length,1);
});

test('free works at paid cap; only established free admission denial permits paid fallback',async t=>{
 const values:Record<string,string>={...config,CLOUDFLARE_QUALITY_APPROVED:'true',CLOUDFLARE_WORKERS_PLAN:'free',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_API_TOKEN:'synthetic-free'};
 const get=(k:string)=>values[k];let mode='success',paid=0,free=0,settled=0;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=String(input),value=JSON.parse(String(init?.body));
  if(url.endsWith('/admit_ai_request'))return mode==='quota'?Response.json({message:'AI daily quota reached'},{status:400}):Response.json(null);
  if(url.endsWith('/reserve_ai_neurons'))return mode==='malformed-db'?new Response('not JSON'):mode==='db'?Response.json({message:'db unavailable'},{status:500}):Response.json(mode==='exhausted'?null:value.reservation);
  if(url.endsWith('/settle_ai_neurons')){settled++;return Response.json(null)}
  if(url.endsWith('/reserve_ai_spend')){paid++;return Response.json({message:'AI monthly budget reached'},{status:400})}
  free++;
  if(['429','401','500'].includes(mode))return Response.json({},{status:Number(mode)});
  if(mode==='network')throw new Error('network unavailable');
  if(mode==='envelope')return Response.json({success:false});
  return Response.json({success:true,result:{response:'{}',usage:mode==='malformed'?{prompt_tokens:-1,completion_tokens:1}:undefined}});
 });
 const call=()=>provider(get,160,45000,hostedAccounting(get,'viewer','omen')).json('test',{}, {},()=>true);
 assert.deepEqual(await call(),{});assert.equal(paid,0);assert.equal(settled,0);
 mode='malformed';assert.deepEqual(await call(),{});assert.equal(settled,0);
 for(mode of ['429','401','500','network','envelope','db','malformed-db','quota'])await assert.rejects(call());
 assert.equal(paid,0);
 mode='exhausted';await assert.rejects(call(),e=>e instanceof Error&&e.message===budgetMessage);assert.equal(paid,1);
 const priorFree=free;values.CLOUDFLARE_QUALITY_APPROVED='false';
 await assert.rejects(call(),e=>e instanceof Error&&e.message===budgetMessage);assert.equal(free,priorFree);
 values.DEEPINFRA_QUALITY_APPROVED='false';await assert.rejects(call(),/not available yet/);assert.equal(paid,2);
});
