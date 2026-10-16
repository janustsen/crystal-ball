import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient,type Session} from '@supabase/supabase-js';
import {anonymousOwner,mirror,restoreBackup} from '../src/cloud.ts';
import {answerAsk,asksOf,bonusDue,deckFor,insightDue,nextAsk,selfKey} from '../src/ball-asks';
import {questionsAsked,unlocked} from '../src/ladder';
import type {AccountState} from '../src/types.ts';
const empty:AccountState={sunSign:null,ageBand:'teen',ageConfirmed:true,onboardingDone:true,ladder:{asked:0,opened:[]},facts:{},history:[],credits:5,plus:false,usage:{day:'2026-09-30',count:0},reduceMotion:false,largeText:false};
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
test('restore drops the device chart weather cache, which may belong to another account',async()=>{
 const {client}=archive();
 assert.equal((await restoreBackup({...empty,chartWeather:{month:'2026-10',text:'Steady.'}},client)).chartWeather,undefined);
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

test('older backup restore leaves the reading balance alone',async()=>{
 const {remote,client}=archive();remote.history=[];
 const local={...empty,onboardingDone:true,ageConfirmed:true};
 const restored=await restoreBackup(local,client);
 assert.equal(restored.credits,local.credits);assert.deepEqual(restored.history,[]);
});

for(const teen of [false,true])test(`restore reconciles ${teen?'teen':'adult'} answers into distinct progress`,async()=>{
 const {remote,client}=archive(),deck=deckFor(teen),local={...empty,ageBand:teen?'teen' as const:'adult' as const};
 let original:AccountState=local;
 for(const ask of deck.slice(0,24))original=answerAsk(original,ask.id,ask.options[0]);
 await mirror({...original,backupOwner:remote.owner},client);
 remote.facts.self_bogus='Yes';remote.facts[selfKey(deck[24].id)]='Not an option';
 if(teen)remote.facts.self_date_idea='A cozy night in';
 let restored=await restoreBackup(local,client);
 assert.equal(asksOf(restored).seen.length,24);assert.equal(insightDue(asksOf(restored)),true);
 const next=nextAsk(restored,teen)!;
 restored=answerAsk(restored,next.id,next.options[0]);
 assert.equal(asksOf(restored).seen.length,25);assert.equal(bonusDue(asksOf(restored)),1);
 const insight={kind:'portrait' as const,title:'Portrait',text:'Reflection',at:'2026-10-09'};
 restored={...restored,asks:{...asksOf(restored),bonus:1,insights:[insight],skipped:[deck[0].id,deck[30].id]}};
 const again=await restoreBackup(restored,client);
 assert.equal(asksOf(again).seen.length,25);assert.equal(bonusDue(asksOf(again)),0);
 assert.deepEqual(asksOf(again).insights,[insight]);assert.deepEqual(asksOf(again).skipped,[deck[30].id]);
 assert.equal(again.credits,local.credits);
});

test('a session the server no longer knows is replaced, checked once per launch',async()=>{
 const saved=new Map<string,string>(),storage={getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>void saved.set(key,value),removeItem:(key:string)=>void saved.delete(key)};
 let users=0,signups=0,expiresIn=3600,server:'ok'|'gone'|'offline'|'down'='ok';
 const launch=()=>createClient('https://reset.invalid','test-key',{auth:{storage,persistSession:true,autoRefreshToken:false},global:{fetch:async input=>{
  const url=new URL(String(input));
  if(url.pathname.endsWith('/user')){
   users++;if(server==='offline')throw new TypeError('Network request failed');
   if(server==='down')return Response.json({msg:'Internal error'},{status:500});
   return server==='gone'?Response.json({code:'user_not_found',msg:'User from sub claim in JWT does not exist'},{status:403}):Response.json({id:`owner-${signups}`,aud:'authenticated',is_anonymous:true});
  }
  if(url.searchParams.get('grant_type')==='refresh_token')return Response.json({code:'refresh_token_not_found',msg:'Invalid Refresh Token: Refresh Token Not Found'},{status:400});
  signups++;
  return Response.json({access_token:`token-${signups}`,refresh_token:'refresh',expires_in:expiresIn,token_type:'bearer',user:{id:`owner-${signups}`,aud:'authenticated',is_anonymous:true}});
 }}});
 assert.equal(await anonymousOwner(launch()),'owner-1');assert.equal(users,0);
 const relaunched=launch();
 assert.equal(await anonymousOwner(relaunched),'owner-1');assert.equal(await anonymousOwner(relaunched),'owner-1');assert.equal(users,1);
 server='offline';assert.equal(await anonymousOwner(launch()),'owner-1');assert.equal(signups,1);
 server='down';assert.equal(await anonymousOwner(launch()),'owner-1');assert.equal(signups,1);
 // The preview database was reset: the stored user is gone.
 server='gone';const reset=launch();
 assert.equal(await anonymousOwner(reset),'owner-2');assert.equal(await anonymousOwner(reset),'owner-2');assert.equal(signups,2);
 // Reset long enough ago that the access token expired and its refresh token is unknown.
 expiresIn=-60;assert.equal(await anonymousOwner(launch()),'owner-3');
 const checks=users;assert.equal(await anonymousOwner(launch()),'owner-4');assert.equal(users,checks);assert.equal(signups,4);
});

test('restoring larger, smaller and empty histories preserves earned ladder progress',async()=>{
 const {remote,client}=archive();
 remote.history=Array.from({length:20},(_,i)=>({...reading,id:`${i.toString(16).padStart(8,'0')}-1234-1234-1234-123456789abc`}));
 const local={...empty,ladder:{asked:3,opened:['about' as const]}};
 const restored=await restoreBackup(local,client);
 assert.equal(restored.ladder.asked,20);
 assert.deepEqual(restored.ladder.opened,['about']);
 const forgotten={...restored,history:[]};
 assert.equal(questionsAsked(forgotten),20);
 assert.equal(unlocked(forgotten,'library'),true);
 for(const count of [1,0]){
  remote.history=remote.history.slice(0,count);
  assert.equal((await restoreBackup(forgotten,client)).ladder.asked,20);
  assert.equal((await restoreBackup({...local,history:restored.history},client)).ladder.asked,20);
 }
});
