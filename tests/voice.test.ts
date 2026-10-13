import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceFlags} from '../server/voice';

test('editorial fixtures flag doom, private-feeling claims and certainty',()=>{
 const fixtures:[string,string[]][]=[
  ['You are doomed to fail.',['doom']],
  ['Alex secretly loves you.',['secretFeelings']],
  ['Your crush is hiding romantic feelings.',['secretFeelings']],
  ['They cannot stop thinking about you.',['secretFeelings']],
  ['You will definitely win.',['certainty']],
  ['You are destined to succeed.',['certainty']],
  ['Guaranteed: you will always be together.',['certainty']],
  ['You will finish a first draft this year. This scenario assumes you keep writing daily.',[]],
  ['Speculative forecast · not a guarantee. Golden edition · same uncertainty.',[]],
  ['Not quite saved. Thanks for saying so — the Ball can miss.',[]],
 ];
 for(const [text,expected] of fixtures)assert.deepEqual(voiceFlags(text),expected,text);
});

test('the actual forecast and omen prompts carry the shared voice instruction',async()=>{
 const {ballVoice}=await import('../server/voice');
 const {predict}=await import('../server/engine');
 const {personalOmen}=await import('../server/omen');
 const {provider}=await import('../server/provider');
 const original=globalThis.fetch,seen:string[]=[];
 globalThis.fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body)),system=body.messages[0].content;
  seen.push(system);
  const response=system.includes('Classify')?{category:'allow'}:system.includes('daily omen')?{text:'A little starlight invites a fresh beginning.',whisper:'By tonight, a small plan may change for the better.'}:{prediction:'You will finish a first draft.',basis:'context_1',insight:'You keep writing for an hour each day.'};
  return new Response(JSON.stringify({message:{content:JSON.stringify(response)}}));
 };
 try{
  const result=await predict('Will I finish my novel this year?',{context_1:'I write for an hour daily.',horizon:'this year'},false,provider(()=>undefined),{ageConfirmed:true});
  assert.equal(result.kind,'ok',JSON.stringify(result));
  await personalOmen({},provider(()=>undefined));
  assert.equal(seen.filter(s=>s.includes(ballVoice)).length,2);
 }finally{globalThis.fetch=original;}
});
