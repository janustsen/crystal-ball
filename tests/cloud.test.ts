import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient,type Session} from '@supabase/supabase-js';
import {mirror,restoreBackup} from '../src/cloud.ts';
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
 owner='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';await mirror(restored,client);assert.equal(calls.at(-1)?.body[0].user_id,owner);
 broken=true;await assert.rejects(restoreBackup(empty,client),/unreadable reading/);
});
