import {settleCircleReading} from '../src/reading-history';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient,type Session} from '@supabase/supabase-js';
import {anonymousOwner,mirror,restoreBackup} from '../src/cloud.ts';
import type {AccountState} from '../src/types.ts';
const empty:AccountState={sunSign:null,ageBand:'teen',ageConfirmed:true,onboardingDone:true,facts:{},history:[],credits:5,plus:false,usage:{day:'2026-09-30',count:0},reduceMotion:false,largeText:false};
const reading={id:'12345678-1234-1234-1234-123456789abc',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-09-30T00:00:00Z',label:'Speculative',why:'Practice',facts:{practice:'daily'},sources:[],assumptions:[],friend:false};
function archive(){
 const remote={facts:{practice:'daily'} as Record<string,string>,history:[reading],writes:0,failRead:false,hasArchive:true,owner:'apple-owner'};
 const client=createClient('https://backup.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
  const url=new URL(String(input)),method=init?.method??'GET';
  if(method==='GET'){
   if(remote.failRead)return new Response('unavailable',{status:400});
   return Response.json(url.pathname.endsWith('knowledge')?(remote.hasArchive?[{facts:remote.facts}]:[]):remote.history.map(payload=>({payload})));
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

test('restore sorts dates across all pages while fetching in stable ID order',async()=>{
 const readings=Array.from({length:501},(_,i)=>({...reading,id:`${i.toString(16).padStart(8,'0')}-1234-1234-1234-123456789abc`,createdAt:new Date(Date.UTC(2026,0,1)+i*60000).toISOString()}));
 const offsets:number[]=[];
 const client=createClient('https://backup.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input)=>{
  const url=new URL(String(input));
  if(url.pathname.endsWith('knowledge'))return Response.json([{facts:{}}]);
  assert.equal(url.searchParams.get('order'),'id.asc');
  const offset=Number(url.searchParams.get('offset')),limit=Number(url.searchParams.get('limit'));offsets.push(offset);
  return Response.json(readings.slice(offset,offset+limit).map(payload=>({payload})));
 }}});
 client.auth.getSession=async()=>({data:{session:{user:{id:'apple-owner',is_anonymous:false},access_token:'test-token'} as Session},error:null});
 const restored=await restoreBackup(empty,client);
 assert.deepEqual(offsets,[0,500]);
 assert.deepEqual(restored.history.map(p=>p.id),readings.toReversed().map(p=>p.id));
});

test('missing archive is rejected without changing local data; saved empty archive restores',async()=>{
 const {remote,client}=archive();
 remote.hasArchive=false;remote.history=[];
 const local={...empty,facts:{practice:'weekly'},history:[reading]};
 const before=structuredClone(local);
 await assert.rejects(restoreBackup(local,client),/No saved Apple backup/);
 assert.deepEqual(local,before);assert.equal(remote.writes,0);
 remote.hasArchive=true;remote.facts={};
 const restored=await restoreBackup(local,client);
 assert.deepEqual(restored.history,[]);assert.deepEqual(restored.facts,{});
});


test('concurrent owner requests share signup and observe the subsequent Apple session',async()=>{
 let signups=0,release!:()=>void,started!:()=>void;
 const pending=new Promise<void>(resolve=>{release=resolve}),signupStarted=new Promise<void>(resolve=>{started=resolve});
 const client=createClient('https://identity.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input)=>{
  const url=new URL(String(input));
  if(url.pathname.endsWith('/signup')){signups++;started();await pending;}
  else assert.equal(url.searchParams.get('grant_type'),'id_token');
  const apple=url.pathname.endsWith('/token');
  return Response.json({access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user:{id:apple?'apple-owner':'anonymous-owner',is_anonymous:!apple}});
 }}});
 const owners=Array.from({length:8},()=>anonymousOwner(client));
 const apple=anonymousOwner(client).then(async owner=>{
  assert.equal(owner,'anonymous-owner');
  const result=await client.auth.signInWithIdToken({provider:'apple',token:'test-apple-token'});
  assert.equal(result.error,null);
 });
 await signupStarted;
 await new Promise<void>(resolve=>setImmediate(resolve));
 const inFlightSignups=signups;release();
 assert.deepEqual(await Promise.all(owners),Array(8).fill('anonymous-owner'));
 await apple;
 assert.equal(inFlightSignups,1);assert.equal(signups,1);
 assert.equal(await anonymousOwner(client),'apple-owner');
 assert.equal(signups,1);
});

test('failed owner signup is shared then cleared for retry',async()=>{
 let signups=0;
 const client=createClient('https://retry-identity.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async()=>{
  signups++;
  if(signups===1)return Response.json({msg:'Signup unavailable',code:'signup_disabled'},{status:400});
  return Response.json({access_token:'test-token',refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user:{id:'retried-owner',is_anonymous:true}});
 }}});
 const failures=await Promise.allSettled(Array.from({length:4},()=>anonymousOwner(client)));
 assert.ok(failures.every(result=>result.status==='rejected'));
 assert.equal(signups,1);
 assert.equal(await anonymousOwner(client),'retried-owner');
 assert.equal(signups,2);
 assert.equal(await anonymousOwner(client),'retried-owner');
 assert.equal(signups,2);
 assert.equal(await anonymousOwner(null),null);
});

test('older backup restore preserves local Circle charge receipts',async()=>{
 const {remote,client}=archive();remote.history=[];
 const local={...empty,onboardingDone:true,ageConfirmed:true,circleCharges:['circle-reading']};
 const restored=await restoreBackup(local,client);
 assert.deepEqual(restored.circleCharges,['circle-reading']);
 let writes=0,marks=0;
 await settleCircleReading(restored,{id:'circle-reading',circle_id:'circle',asker_id:'apple-owner',charged_at:null,question:'Will we learn together?',headline:'A skill awaits.',due_date:'2099-01-01',created_at:'2026-10-03T00:00:00Z'},async()=>{writes++},async()=>{marks++});
 assert.equal(writes,0);assert.equal(marks,1);
 assert.equal(restored.credits,local.credits);assert.deepEqual(restored.history,[]);
});

test('optional original-question labels survive the actual backup client round trip',async()=>{
 const {client}=archive();const restored=await restoreBackup(empty,client);
 const labeled={...reading,answerQuestions:{practice:'How often do you practise?'}};
 await mirror({...restored,history:[labeled]},client);
 assert.deepEqual((await restoreBackup(empty,client)).history,[labeled]);
});
