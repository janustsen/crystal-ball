import test from 'node:test';
import assert from 'node:assert/strict';
import {validatedProvider} from '../server/provider.ts';
import {firstCardGate,measureFirstCard} from '../scripts/hosted-first-card.ts';

function fakeProvider(callSeconds:number,repair=false){
 let elapsed=0,drafts=0,calls=0;
 const model=validatedProvider(async(_messages,schema)=>{
  elapsed+=callSeconds*1000;calls++;
  const fields=schema.properties as Record<string,unknown>;
  if(fields.cards){
   drafts++;
   return JSON.stringify({cards:[{question:repair&&drafts===1?'Will you finish?':'How much have you written?',options:['No draft','Half a draft','Full draft']}]});
  }
  return JSON.stringify(fields.fits?{reason:'Synthetic fixture',fits:true}:{category:'allow'});
 });
 return {model,now:()=>elapsed,calls:()=>calls};
}
const question='Will I finish writing my novel this year?';

test('fast and slow fake providers pass or fail on validated first-card latency',async()=>{
 for(const [callSeconds,expectedSeconds,passed] of [[1,4,true],[3,12,false]] as const){
  const fake=fakeProvider(callSeconds);
  const measured=await measureFirstCard(question,{},fake.model,{},fake.now);
  assert.equal(measured.plan.kind,'ok');
  if(measured.plan.kind==='ok')assert.equal(measured.plan.value.cards[0].question,'How much have you written?');
  assert.equal(fake.calls(),4);
  assert.equal(measured.firstCardSeconds,expectedSeconds);
  assert.deepEqual(firstCardGate([measured.firstCardSeconds],1),{
   limitSeconds:10,expectedSamples:1,samples:1,failedSamples:0,p50Seconds:expectedSeconds,p95Seconds:expectedSeconds,passed,
  });
 }
});

test('first-card timing includes the single repair and validation calls',async()=>{
 const fake=fakeProvider(2,true);
 const measured=await measureFirstCard(question,{},fake.model,{},fake.now);
 assert.equal(measured.plan.kind,'ok');assert.equal(fake.calls(),5);
 assert.equal(measured.firstCardSeconds,10);assert.equal(firstCardGate([measured.firstCardSeconds],1).passed,true);
});

test('p95 uses nearest rank and rejects a slow tail even with a fast p50',()=>{
 const samples=Array.from({length:20},(_,i)=>i<18?1:10.001);
 const gate=firstCardGate(samples,20);
 assert.equal(gate.p50Seconds,1);assert.equal(gate.p95Seconds,10.001);assert.equal(gate.passed,false);
 assert.equal(firstCardGate(Array(20).fill(10),20).passed,true);
 assert.deepEqual(samples.slice(0,2),[1,1]);
});

test('no samples, incomplete runs and failed or invalid measurements cannot pass',async()=>{
 const broken=validatedProvider(async()=>'{invalid');
 const measured=await measureFirstCard(question,{},broken);
 assert.equal(measured.plan.kind,'error');assert.equal(measured.firstCardSeconds,null);
 for(const samples of [[],[1],[1,null],[1,NaN],[1,Infinity],[1,-1]])assert.equal(firstCardGate(samples,2).passed,false);
 assert.equal(firstCardGate([],0).passed,false);
});

test('a sensitive redirect has no first question card',async()=>{
 const fake=fakeProvider(1);
 const measured=await measureFirstCard('When will I die?',{},fake.model,{},fake.now);
 assert.equal(measured.plan.kind,'blocked');assert.equal(measured.firstCardSeconds,null);
});
