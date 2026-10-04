import test from 'node:test';
import assert from 'node:assert/strict';
import {ageGroup,sunSign} from '../src/profile.ts';
import {assertSafe,forecasts,profileBirthday,receiptExamples,receipts,signs} from '../scripts/content/hooks.mjs';

test('content hooks follow the rules and cover a 30-video bank',()=>{
 for(const f of forecasts){assertSafe(f.hook);assertSafe(f.question)}
 for(const r of receipts)assertSafe(r.question);
 assert.ok(forecasts.length>=12&&receipts.length>=10);
 assert.equal(new Set([...forecasts,...receipts].map(x=>x.category)).size,forecasts.length+receipts.length);
 assert.equal(ageGroup(profileBirthday),'adult');
 assert.deepEqual(signs.map(s=>[sunSign(s.birthday),ageGroup(s.birthday)]),signs.map(s=>[s.sign.toLowerCase(),'adult']));
});

test('content rules reject names, minors, accuracy claims and reveal-who mechanics',()=>{
 for(const text of ['Will Sarah text me back?','Find your soulmate','The ball is accurate','For teens only','It reveals who likes you','92% right'])assert.throws(()=>assertSafe(text),/Content rule/);
 assert.doesNotThrow(()=>assertSafe('Cancer moons glow bright when you share your quietest joys with someone who listens.'));
});

test('check-in examples disclose demos and rotate all three outcomes',()=>{
 const day=Math.round(Date.parse('2026-10-05')/864e5);
 for(const count of [1,3,10,12]){
  const batches=[0,1,2].map(offset=>receiptExamples(day+offset,count));
  for(const batch of batches){
   assert.equal(batch.length,count);
   for(const item of batch){
    assert.equal(item.hook,'How a check-in works');
    assert.equal(item.label,'AI-generated demo');
    assertSafe(item.hook);assertSafe(item.question);
   }
   if(count>=3)assert.deepEqual(new Set(batch.map(item=>item.outcome)),new Set(['yes','no','pending']));
  }
  assert.deepEqual(new Set(batches.map(batch=>batch[0].outcome)),new Set(['yes','no','pending']));
 }
 const packages=[0,1,2].map(offset=>receiptExamples(day+offset,12).find(item=>item.category==='package'));
 assert.deepEqual(new Set(packages.map(item=>item.outcome)),new Set(['yes','no','pending']));
 assert.deepEqual(receiptExamples(day,0),[]);
});
