import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient,type Session} from '@supabase/supabase-js';
import {mirror,restoreBackup} from '../src/cloud.ts';
import type {AccountState} from '../src/types.ts';
const empty:AccountState={facts:{},history:[],credits:5,plus:false,usage:{day:'2026-09-30',count:0},reduceMotion:false,largeText:false};
const reading={id:'12345678-1234-1234-1234-123456789abc',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-09-30T00:00:00Z',label:'Speculative',why:'Practice',facts:{practice:'daily'},sources:[],assumptions:[],friend:false};
function archive(){
 const remote={facts:{practice:'daily'} as Record<string,string>,history:[reading],writes:0,failRead:false,owner:'apple-owner'};
 const client=createClient('https://backup.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
  const url=new URL(String(input)),method=init?.method??'GET';
  if(method==='GET'){
   if(remote.failRead)return new Response('unavailable',{status:400});
   return Response.json(url.pathname.endsWith('knowledge')?[{facts:remote.facts}]:remote.history.map(payload=>({payload})));
  }
  remote.writes++;
  if(method==='DELETE'){
   assert.equal(url.searchParams.get('user_id'),`eq.${remote.owner}`);
   const keep=url.searchParams.get('id')?.slice(8,-1).split(',')??[];
   remote.history=remote.history.filter(p=>keep.includes(p.id));
  }else{
   const body=JSON.parse(String(init?.body));
   if(url.pathname.endsWith('knowledge'))remote.facts=body.facts;
   else remote.history=[...new Map([...remote.history,...body.map((row:any)=>row.payload)].map(p=>[p.id,p])).values()];
  }
  return new Response(null,{status:204});
 }}});
 client.auth.getSession=async()=>({data:{session:{user:{id:remote.owner,is_anonymous:false},access_token:'test-token'} as Session},error:null});
 return {remote,client};
}
test('fresh-phone and explicit restore replace facts/history without writing or restoring entitlements',async()=>{
 const {remote,client}=archive();
 for(const local of [empty,{...empty,facts:{local:'only'},history:[{...reading,id:'22345678-1234-1234-1234-123456789abc'}]}]){
  const restored=await restoreBackup(local,client);
  assert.deepEqual(restored.facts,remote.facts);assert.deepEqual(restored.history,[reading]);
  assert.equal(restored.credits,5);assert.equal(restored.backupOwner,'apple-owner');assert.equal(remote.writes,0);
 }
 remote.failRead=true;await assert.rejects(restoreBackup(empty,client));assert.equal(remote.writes,0);
});
test('uploads replace the one-device archive, including forgotten facts and empty history',async()=>{
 const {remote,client}=archive();
 const restored=await restoreBackup(empty,client);
 const next={...reading,id:'22345678-1234-1234-1234-123456789abc'};
 await mirror({...restored,facts:{},history:[next]},client);
 assert.deepEqual(remote.facts,{});assert.deepEqual(remote.history,[next]);
 await mirror({...restored,facts:{},history:[]},client);
 assert.deepEqual(remote.history,[]);assert.deepEqual((await restoreBackup(empty,client)).facts,{});
 await mirror(restored,client);
 assert.deepEqual(remote.history,[reading]);assert.deepEqual(remote.facts,restored.facts);
});
test('automatic uploads cannot write an unselected account',async()=>{
 const {remote,client}=archive();
 await assert.rejects(mirror(empty,client),/account changed/);
 await assert.rejects(mirror({...empty,backupOwner:'other-owner'},client),/account changed/);
 assert.equal(remote.writes,0);
});
