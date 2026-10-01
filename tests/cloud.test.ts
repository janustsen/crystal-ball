import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient,type Session} from '@supabase/supabase-js';
import {mirror,restoreBackup} from '../src/cloud.ts';
import {trackBackupDeletion,pendingBackupDeletion,persistBackup} from '../src/backup.ts';
import type {AccountState} from '../src/types.ts';
const empty:AccountState={facts:{},history:[],credits:0,plus:false,usage:{day:'2026-09-30',count:0},reduceMotion:false,largeText:false};
const reading={id:'12345678-1234-1234-1234-123456789abc',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-09-30T00:00:00Z',label:'Speculative',why:'Practice',facts:{practice:'daily'},sources:[],assumptions:[],friend:false};
test('real Supabase query builder restores a fresh device before upload; current owner follows auth changes',async()=>{
 let owner='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',broken=false;const calls:{url:URL;body:any;method:string}[]=[];
 const client=createClient('https://backup.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
  const url=new URL(String(input));calls.push({url,method:init?.method||'GET',body:init?.body?JSON.parse(String(init.body)):null});
  if(init?.method==='POST'||init?.method==='DELETE')return new Response(null,{status:204});
  return Response.json(url.pathname.endsWith('knowledge')?[{facts:{practice:'daily'}}]:[{payload:broken?{id:'invalid'}:reading}]);
 }}});
 client.auth.getSession=async()=>({data:{session:{user:{id:owner,is_anonymous:false},access_token:'test-token'} as Session},error:null});
 const restored=await restoreBackup(empty,client);assert.equal(restored.history.length,1);assert.equal(restored.credits,0);
 assert.ok(calls.every(c=>c.method==='GET'));assert.ok(calls.every(c=>c.url.searchParams.get('user_id')===`eq.${owner}`));
 await mirror(restored,client);assert.equal(calls.at(-1)?.url.searchParams.get('on_conflict'),'user_id,id');assert.equal(calls.at(-1)?.body[0].user_id,owner);
 owner='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';await assert.rejects(mirror(restored,client),/account changed/);await mirror(await restoreBackup(restored,client),client);assert.equal(calls.at(-1)?.body[0].user_id,owner);
 broken=true;await assert.rejects(restoreBackup(empty,client),/unreadable reading/);
});

test('offline forgetting persists through restart and replaces the archive before restoring',async()=>{
 for(const mode of ['fact','everything','already-empty','everything-then-reading']){
  let online=true,failDelete=false;
  let archive={facts:{practice:'daily',level:'beginner'},history:[reading]};
  const client=createClient('https://backup.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
   if(!online)throw new Error('Offline');
   const url=new URL(String(input)),method=init?.method||'GET';
   assert.equal(method==='POST'?undefined:url.searchParams.get('user_id'),method==='POST'?undefined:'eq.apple-owner');
   if(method==='DELETE'){
    if(failDelete)return new Response('unavailable',{status:503});
    archive.history=[];return new Response(null,{status:204});
   }
   if(method==='POST'){
    const body=JSON.parse(String(init?.body));
    if(url.pathname.endsWith('knowledge'))archive.facts=body.facts;
    else archive.history=body.map((row:any)=>row.payload);
    return new Response(null,{status:204});
   }
   return Response.json(url.pathname.endsWith('knowledge')?[{facts:archive.facts}]:archive.history.map(payload=>({payload})));
  }}});
  client.auth.getSession=async()=>({data:{session:{user:{id:'apple-owner',is_anonymous:false},access_token:'test-token'} as Session},error:null});
  const saved=mode==='already-empty'?{...empty,backupOwner:'apple-owner'}:await restoreBackup(empty,client);
  online=false;
  let forgotten=trackBackupDeletion(saved,mode==='fact'?{...saved,facts:{level:'beginner'}}:{...saved,facts:{},history:[]},mode!=='fact');
  assert.equal(pendingBackupDeletion(forgotten),true);
  if(mode==='everything-then-reading')forgotten={...forgotten,history:[{...reading,id:'22345678-1234-1234-1234-123456789abc'}]};
  const restarted:AccountState=JSON.parse(JSON.stringify(forgotten));
  await assert.rejects(mirror(restarted,client));
  await assert.rejects(restoreBackup(restarted,client));
  online=true;failDelete=true;
  await assert.rejects(restoreBackup(restarted,client));
  assert.equal(pendingBackupDeletion(restarted),true);
  failDelete=false;
  const restored=await restoreBackup(restarted,client);
  assert.deepEqual(restored.facts,forgotten.facts);assert.deepEqual(restored.history,forgotten.history);
  assert.equal(pendingBackupDeletion(restored),false);
  const freshDevice=await restoreBackup(empty,client);
  assert.deepEqual(freshDevice.facts,forgotten.facts);assert.deepEqual(freshDevice.history,forgotten.history);
  assert.deepEqual((await restoreBackup(restored,client)).facts,forgotten.facts);
 }
});

test('unowned deletions cannot erase an Apple archive; owned deletions reject a different account',async()=>{
 let writes=0;
 const client=createClient('https://backup.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
  if(init?.method==='POST'||init?.method==='DELETE'){writes++;return new Response(null,{status:204})}
  return Response.json(String(input).includes('/knowledge')?[{facts:{practice:'daily'}}]:[{payload:reading}]);
 }}});
 client.auth.getSession=async()=>({data:{session:{user:{id:'existing-apple',is_anonymous:false},access_token:'test-token'} as Session},error:null});
 for(const all of [false,true]){
  const local={...empty,facts:{practice:'local'}};
  const forgotten=trackBackupDeletion(local,{...local,facts:{}},all);
  const restored=await restoreBackup(JSON.parse(JSON.stringify(forgotten)),client);
  assert.equal(restored.history.length,1);assert.equal(restored.facts.practice,'daily');assert.equal(writes,0);
  const owned={...local,backupOwner:'another-owner'};
  const pending=trackBackupDeletion(owned,{...owned,facts:{}},all);
  await assert.rejects(restoreBackup(pending,client),/another backup account/);
  await assert.rejects(mirror(pending,client),/account changed/);
  assert.equal(writes,0);
 }
});

test('automatic writes persist acknowledgements and queued writes never replay them',async()=>{
 for(const all of [false,true]){
  let archive=[reading],deletes=0;
  const client=createClient('https://backup.invalid','test-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
   const method=init?.method||'GET';
   if(method==='DELETE'){deletes++;archive=[];return new Response(null,{status:204})}
   if(method==='POST'){
    if(String(input).includes('/predictions')){
     const rows=JSON.parse(String(init?.body));
     archive=[...new Map([...archive,...rows.map((row:any)=>row.payload)].map(p=>[p.id,p])).values()];
    }
    return new Response(null,{status:204});
   }
   return Response.json(String(input).includes('/knowledge')?[{facts:{}}]:archive.map(payload=>({payload})));
  }}});
  client.auth.getSession=async()=>({data:{session:{user:{id:'apple-owner',is_anonymous:false},access_token:'test-token'} as Session},error:null});
  const original={...empty,backupOwner:'apple-owner',history:[reading],facts:{practice:'daily'}};
  let state=trackBackupDeletion(original,{...original,facts:{},history:all?[]:[reading]},all),disk='';
  const write=()=>persistBackup(()=>state,fn=>{state=fn(state)},async s=>{disk=JSON.stringify(s)},s=>mirror(s,client));
  const another={...reading,id:'22345678-1234-1234-1234-123456789abc'};
  const first=write();
  const queued=first.then(()=>{archive.push(another);state={...state,largeText:true};return write()});
  await queued;
  assert.equal(deletes,1);assert.ok(archive.some(p=>p.id===another.id));
  assert.equal(pendingBackupDeletion(JSON.parse(disk)),false);
  const restored=await restoreBackup(JSON.parse(disk),client);
  assert.equal(deletes,1);assert.ok(restored.history.some(p=>p.id===another.id));
 }
});

test('a deletion during upload stays pending, and upload failures never acknowledge it',async()=>{
 const original={...empty,backupOwner:'apple-owner',facts:{a:'one',b:'two'}};
 let state=trackBackupDeletion(original,{...original,facts:{b:'two'}}),disk='';
 let release!:(receipt:{owner:string;revision:number})=>void;
 const delayed=new Promise<{owner:string;revision:number}>(resolve=>{release=resolve});
 let started!:()=>void;const uploading=new Promise<void>(resolve=>{started=resolve});
 const first=persistBackup(()=>state,fn=>{state=fn(state)},async s=>{disk=JSON.stringify(s)},async()=>{started();return delayed});
 await uploading;
 state=trackBackupDeletion(state,{...state,facts:{}});
 release({owner:'apple-owner',revision:1});await first;
 assert.equal(state.backupRevision,2);assert.equal(state.backupAcknowledged,1);
 assert.equal(pendingBackupDeletion(JSON.parse(disk)),true);
 await assert.rejects(persistBackup(()=>state,fn=>{state=fn(state)},async s=>{disk=JSON.stringify(s)},async()=>{throw new Error('offline')}));
 assert.equal(state.backupAcknowledged,1);assert.equal(pendingBackupDeletion(JSON.parse(disk)),true);
});
