import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../server/handler.ts';

const viewer='0f0e0d0c-0b0a-4908-8706-050403020100',requestId='11111111-1111-4111-8111-111111111111';
const env:Record<string,string>={SUPABASE_URL:'http://127.0.0.1:55321',SUPABASE_SERVICE_ROLE_KEY:'test-only',REVENUECAT_SECRET_KEY:'sk_test_only'};

// Fake ledger with the same per-ask accounting as charge_reading: first use charged, one free retry, then charged again.
function ledger(t:any,packs:number){
 const uses=new Map<string,number>();let charges=0,models=0;const applied:any[]=[];
 const balance=()=>({owner:viewer,asOf:'2026-10-04T00:00:00.000001Z',plus:false,plusUntil:null,packs:Math.max(0,packs-charges+1),used:Math.min(charges,1),day:'2026-10-04'});
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=new URL(String(input)),body=init?.body?JSON.parse(String(init.body)):null;
  if(body?.messages){models++;return Response.json({message:{content:JSON.stringify(body.format.properties.prediction?{prediction:'You will make progress.',basis:'context_1',insight:'Practice continues.'}:{category:'allow'})}})}
  if(url.pathname==='/auth/v1/user')return Response.json({id:viewer});
  if(url.pathname==='/rest/v1/reading_charges'){const id=url.searchParams.get('reading_id')!.slice(3);return Response.json(uses.has(id)?[{reading_id:id,uses:uses.get(id)}]:[])}
  if(url.pathname==='/rest/v1/rpc/reading_balance')return Response.json(balance());
  if(url.pathname==='/rest/v1/rpc/charge_reading'){const n=uses.get(body.reading)??0;uses.set(body.reading,n+1);if(n!==1)charges++;return Response.json(balance())}
  if(url.pathname==='/rest/v1/rpc/apply_store_entitlements'){applied.push(body);return Response.json(balance())}
  if(url.hostname==='api.revenuecat.com')return Response.json({request_date:'2026-10-04T12:00:00Z',subscriber:{entitlements:{},non_subscriptions:{}}});
  throw new Error(`Unexpected URL: ${url}`);
 });
 return {charges:()=>charges,models:()=>models,applied};
}
const ask=(facts:Record<string,string>)=>new Request('http://localhost/',{method:'POST',headers:{authorization:'Bearer user-token'},body:JSON.stringify({action:'predict',requestId,question:'Will I finish my course?',facts,ageConfirmed:true})});

test('a reused ask key is free once, then charged; changed answers are a new reading',async t=>{
 const l=ledger(t,2),serve=handler(k=>env[k]);
 const same={context_1:'Daily practice',horizon:'next month'};
 assert.equal((await serve(ask(same))).status,200);assert.equal(l.charges(),1);
 assert.equal((await serve(ask({...same,context_1:'Weekly practice'}))).status,200);assert.equal(l.charges(),2);
 assert.equal((await serve(ask(same))).status,200);assert.equal(l.charges(),2);
 assert.equal((await serve(ask(same))).status,200);assert.equal(l.charges(),3);
 const before=l.models(),exhausted=await serve(ask({...same,context_1:'Rarely'}));
 assert.equal(exhausted.status,402);assert.equal(l.models(),before);
});

test('reconciliation orders snapshots by RevenueCat request_date',async t=>{
 const l=ledger(t,0);
 const response=await handler(k=>env[k])(new Request('http://localhost/billing',{method:'POST',headers:{authorization:'Bearer user-token'},body:JSON.stringify({action:'sync'})}));
 assert.equal(response.status,200);
 assert.equal(l.applied[0].snapshot_at,'2026-10-04T12:00:00Z');
});
