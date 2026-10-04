import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../server/handler.ts';
import {storeEntitlements,webhookUsers} from '../server/billing.ts';
import {readingsLeft} from '../src/billing.ts';
import {saveCircleReading,withBalance,circleReading} from '../src/reading-history.ts';
import type {AccountState} from '../src/types.ts';

const viewer='0f0e0d0c-0b0a-4908-8706-050403020100';
const balance=(over:object={})=>({plus:false,plusUntil:null,packs:0,used:0,day:'2026-10-04',...over});

// A fake Supabase/RevenueCat/Ollama boundary that records every billing call.
function boundary(t:any,left:object){
 const calls:{path:string;body:any}[]=[];let modelCalls=0;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=new URL(String(input)),body=init?.body?JSON.parse(String(init.body)):null;
  if(body?.messages){
   modelCalls++;
   const content=body.format.properties.prediction?{prediction:'You will make progress.',basis:'context_1',assumption:'Practice continues.'}:{category:'allow'};
   return Response.json({message:{content:JSON.stringify(content)}});
  }
  calls.push({path:url.pathname,body});
  if(url.pathname==='/auth/v1/user')return init?.headers&&new Headers(init.headers).get('authorization')==='Bearer user-token'?Response.json({id:viewer}):Response.json({},{status:401});
  if(url.pathname==='/rest/v1/rpc/reading_balance')return Response.json(balance(left));
  if(url.pathname==='/rest/v1/rpc/charge_reading'||url.pathname==='/rest/v1/rpc/apply_store_entitlements')return Response.json(balance({used:1}));
  if(url.hostname==='api.revenuecat.com')return Response.json({subscriber:{entitlements:{plus:{expires_date:'2099-01-01T00:00:00Z'}},non_subscriptions:{cb_pack_5:[{id:'txn-1'}]}}});
  throw new Error(`Unexpected URL: ${url}`);
 });
 return {calls,models:()=>modelCalls};
}
const env=(over:Record<string,string>={}):(key:string)=>string|undefined=>{
 const values:Record<string,string>={SUPABASE_URL:'http://127.0.0.1:55321',SUPABASE_SERVICE_ROLE_KEY:'test-only',REVENUECAT_SECRET_KEY:'sk_test_only',REVENUECAT_WEBHOOK_AUTH:'Bearer webhook-test-only',...over};
 return key=>values[key];
};
const predict=(authorization?:string)=>new Request('http://localhost/',{method:'POST',headers:authorization?{authorization}:{},body:JSON.stringify({action:'predict',question:'Will I finish my course?',facts:{context_1:'Daily practice',horizon:'next month'},ageConfirmed:true})});

test('a metered forecast is charged once, after success, with the server balance returned',async t=>{
 const b=boundary(t,{});
 const response=await handler(env())(predict('Bearer user-token'));
 const result=await response.json();
 assert.equal(result.kind,'ok',JSON.stringify(result));
 const charges=b.calls.filter(c=>c.path.endsWith('/charge_reading'));
 assert.deepEqual(charges.map(c=>c.body),[{viewer,reading:result.value.id}]);
 assert.deepEqual(result.balance,balance({used:1}));
});

test('no readings left refuses before inference; no session refuses entirely',async t=>{
 const b=boundary(t,{used:1});
 const empty=await handler(env())(predict('Bearer user-token'));
 assert.equal(empty.status,402);assert.match((await empty.json()).message,/No readings left/);
 const anonymous=await handler(env())(predict());
 assert.equal(anonymous.status,401);
 assert.equal(b.models(),0);
 assert.ok(!b.calls.some(c=>c.path.endsWith('/charge_reading')));
});

test('the loopback preview without Supabase stays unmetered',async t=>{
 const b=boundary(t,{});
 const result=await (await handler(()=>undefined)(predict())).json();
 assert.equal(result.kind,'ok');assert.equal(result.balance,undefined);assert.deepEqual(b.calls,[]);
});

test('RevenueCat webhook requires its secret and reconciles every Supabase user on the event',async t=>{
 const b=boundary(t,{});
 const send=(authorization:string)=>handler(env())(new Request('http://localhost/revenuecat',{method:'POST',headers:{authorization},body:JSON.stringify({event:{type:'TRANSFER',app_user_id:'$RCAnonymousID:abc',transferred_to:[viewer]}})}));
 assert.equal((await send('Bearer wrong')).status,401);
 assert.equal(b.calls.length,0);
 assert.equal((await send('Bearer webhook-test-only')).status,200);
 const applied=b.calls.filter(c=>c.path.endsWith('/apply_store_entitlements'));
 assert.deepEqual(applied.map(c=>c.body),[{viewer,entitled_until:'2099-01-01T00:00:00Z',purchases:[{id:'revenuecat:txn-1',readings:5}]}]);
});

test('client sync reconciles the signed-in user; simulation is loopback-only',async t=>{
 const b=boundary(t,{});
 const send=(serve:(r:Request)=>Promise<Response>,body:object)=>serve(new Request('http://localhost/billing',{method:'POST',headers:{authorization:'Bearer user-token'},body:JSON.stringify(body)}));
 assert.equal((await send(handler(env()),{action:'sync'})).status,200);
 assert.equal(b.calls.filter(c=>c.path.endsWith('/apply_store_entitlements'))[0].body.viewer,viewer);
 assert.equal((await send(handler(env()),{action:'simulate',kind:'five'})).status,403);
 assert.equal((await send(handler(env({SOCIAL_MOCK_ENTITLEMENTS:'true',SUPABASE_URL:'https://project.supabase.co'})),{action:'simulate',kind:'five'})).status,403);
 const local=await send(handler(env({SOCIAL_MOCK_ENTITLEMENTS:'true'})),{action:'simulate',kind:'five'});
 assert.equal(local.status,200);
 assert.match(b.calls.filter(c=>c.path.endsWith('/apply_store_entitlements')).at(-1)!.body.purchases[0].id,/^mock:/);
});

test('RevenueCat subscriber parsing and webhook identities',()=>{
 assert.deepEqual(storeEntitlements({entitlements:{},non_subscriptions:{cb_pack_20:[{id:'a'},{id:'b'}],other:[{id:'c'}]}}),{entitled_until:null,purchases:[{id:'revenuecat:a',readings:20},{id:'revenuecat:b',readings:20}]});
 assert.equal(storeEntitlements({entitlements:{plus:{expires_date:null}}}).entitled_until,'infinity');
 assert.deepEqual(webhookUsers({event:{app_user_id:viewer,aliases:[viewer,'not-a-user'],transferred_from:['$RCAnonymousID:x']}}),[viewer]);
 assert.equal(readingsLeft(balance({used:1,packs:3})),3);
 assert.equal(readingsLeft(balance({plus:true,used:4})),6);
});

test('a published Circle forecast is saved once and the server balance replaces the cache',()=>{
 const state:AccountState={onboardingDone:true,ageConfirmed:true,ageBand:'adult',sunSign:null,facts:{},history:[],credits:2,plus:false,usage:{day:'2026-10-03',count:1},reduceMotion:false,largeText:false};
 const forecast={id:'receipt',asker_id:viewer,charged_at:'2026-10-04T00:00:00Z',circle_id:'circle',question:'Will we learn together?',headline:'A shared skill awaits.',due_date:'2099-01-01',created_at:'2026-10-04T00:00:00Z'};
 const saved=saveCircleReading(state,forecast);
 assert.deepEqual(saved.history,[circleReading(forecast)]);assert.equal(saved.credits,2);
 assert.strictEqual(saveCircleReading(saved,forecast),saved);
 assert.strictEqual(saveCircleReading({...state,onboardingDone:false,ageConfirmed:false},forecast).history.length,0);
 assert.deepEqual(withBalance(saved,balance({plus:true,packs:7,used:3})),{...saved,plus:true,credits:7,usage:{day:'2026-10-04',count:3}});
});
