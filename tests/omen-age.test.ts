import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../server/handler.ts';
import {requestOmen} from '../src/api.ts';
import {birthdayProfile} from '../src/profile.ts';

test('omen refuses missing confirmation and under-13 birthdays before inference',async()=>{
 const original=globalThis.fetch,serve=handler(()=>undefined);let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({message:{content:JSON.stringify({text:'A little starlight invites a fresh beginning in your day.',whisper:'By tonight, a small plan may change for the better.'})}});};
 try{
  for(const age of [{},{ageConfirmed:false},{ageConfirmed:'true'},{viewerBirthday:'2020-01-01',ageConfirmed:true}]){
   const response=await serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'omen',localDate:'2026-10-14',timeZone:'UTC',question:'Today’s personal omen',facts:{},...age})}));
   assert.equal(response.status,400);assert.equal((await response.json()).kind,'error');assert.equal(calls,0);
  }
  for(const age of [{ageConfirmed:true},{viewerBirthday:'1995-06-15'},{viewerBirthday:'2010-01-01'}]){
   const before=calls;
   const response=await serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'omen',localDate:'2026-10-14',timeZone:'UTC',question:'Today’s personal omen',facts:{},...age})}));
   assert.equal(response.status,200);assert.equal((await response.json()).kind,'ok');assert.equal(calls,before+1);
  }
 }finally{globalThis.fetch=original;}
});

test('omen client carries profile eligibility and Sun sign through the real handler',async()=>{
 const original=globalThis.fetch,serve=handler(()=>undefined);let calls=0;
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  if(body.action)return serve(new Request('http://localhost',{method:'POST',body:JSON.stringify({...body,localDate:'2026-10-14',timeZone:'UTC'})}));
  calls++;const {sunSign}=JSON.parse(body.messages[1].content);
  return Response.json({message:{content:JSON.stringify({text:sunSign?'Gemini, a little starlight invites a fresh beginning today.':'A little starlight invites a fresh beginning in your day.',whisper:'By tonight, a small plan may change for the better.'})}});
 };
 try{
  for(const profile of [birthdayProfile(),{sunSign:null,ageConfirmed:true,birthday:'2020-01-01'}]){
   const before=calls;await assert.rejects(()=>requestOmen({},profile),/Insight unavailable/);assert.equal(calls,before);
  }
  for(const profile of [birthdayProfile(undefined,true),birthdayProfile('1995-06-15')]){
   const before=calls,{text}=await requestOmen({},profile);assert.ok(text.length>0);assert.equal(calls,before+1);assert.equal(text.includes('Gemini'),profile.sunSign==='gemini');
  }
 }finally{globalThis.fetch=original;}
});
