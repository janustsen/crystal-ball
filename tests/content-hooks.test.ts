import test from 'node:test';
import assert from 'node:assert/strict';
import {ageGroup,sunSign} from '../src/profile.ts';
import {assertSafe,forecasts,profileBirthday,receipts,signs} from '../scripts/content/hooks.mjs';

test('content hooks follow the rules and cover a 30-video bank',()=>{
 for(const f of forecasts){assertSafe(f.hook);assertSafe(f.question)}
 for(const r of receipts)assertSafe(r.question);
 assert.ok(forecasts.length>=12&&receipts.length>=10);
 assert.equal(new Set([...forecasts,...receipts].map(x=>x.category)).size,forecasts.length+receipts.length);
 assert.deepEqual(new Set(receipts.map(r=>r.outcome)),new Set(['yes','no','pending']));
 assert.equal(ageGroup(profileBirthday),'adult');
 assert.deepEqual(signs.map(s=>[sunSign(s.birthday),ageGroup(s.birthday)]),signs.map(s=>[s.sign.toLowerCase(),'adult']));
});

test('content rules reject names, minors, accuracy claims and reveal-who mechanics',()=>{
 for(const text of ['Will Sarah text me back?','Find your soulmate','The ball is accurate','For teens only','It reveals who likes you','92% right'])assert.throws(()=>assertSafe(text),/Content rule/);
 assert.doesNotThrow(()=>assertSafe('It told me “Your package will arrive this week.” Check back Oct 5.\nIt’s Oct 5.'));
 assert.doesNotThrow(()=>assertSafe('Cancer moons glow bright when you share your quietest joys with someone who listens.'));
});
