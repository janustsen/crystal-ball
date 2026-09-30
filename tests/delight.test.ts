import test from 'node:test';
import assert from 'node:assert/strict';
import {isGolden} from '../src/delight';
test('gold is stable through serialization and occurs once per ten UUID prefixes',()=>{
 let gold=0;
 for(let n=0;n<10000;n++){
  const id=n.toString(16).padStart(8,'0')+'-abcd-4000-8000-000000000000';
  const before=isGolden(id);
  assert.equal(isGolden(JSON.parse(JSON.stringify({id})).id),before);
  if(before)gold++;
 }
 assert.equal(gold,1000);
 assert.equal(isGolden('legacy-reading'),false);
});
