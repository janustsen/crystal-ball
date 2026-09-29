import test from 'node:test';
import assert from 'node:assert/strict';
import {planFor,projection,registry} from '../server/questions.ts';
import {phraseSafety} from '../server/safety.ts';
import {provider} from '../server/provider.ts';
test('known facts never repeat; each domain keeps Other and 3–10 unique cards',()=>{
 for(const [topic,cards] of Object.entries(registry)){
  const questions:Record<string,string>={money:'net worth',learning:'learn Spanish',relocation:'where will I move',growth:'how many users',sports:'World Cup',general:'will my dream happen'};
  for(const n of [0,2,cards.length]){const known=Object.fromEntries(cards.filter(c=>c.remember).slice(0,n).map(c=>[c.id,'known']));const plan=planFor(questions[topic],known);assert.ok(plan.cards.length>=3&&plan.cards.length<=10);assert.equal(new Set(plan.cards.map(c=>c.id)).size,plan.cards.length);assert.ok(plan.cards.every(c=>c.options.includes('Other')&&(!c.remember||!known[c.id])));}
 }
 const f={assets:'10000',debt:'0',windfall:'0',monthly_saving:'100',years:'2',return:'0',saving_growth:'0',withdrawals:'0',inflation:'No, future money'};assert.equal(projection(f),12400);assert.throws(()=>projection({...f,years:'many'}));
 assert.equal(phraseSafety('Will my IVF succeed?'),'pregnancy');assert.equal(phraseSafety('Will I hurt myself again?'),'self_harm');assert.equal(phraseSafety('Will my plant die?'),undefined);
});
test('provider repairs once, then rejects malformed JSON',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({message:{content:'{"category":"allow"'}}))};
 try {await assert.rejects(provider(()=>undefined).json('test',{}, {type:'object'},(x):x is object=>typeof x==='object'));assert.equal(calls,2);}finally{globalThis.fetch=original;}
});
