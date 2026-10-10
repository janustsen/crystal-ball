import test from 'node:test';
import assert from 'node:assert/strict';
import {typeBirthday,joinBirthday,type BirthdayParts} from '../src/profile.ts';
const empty:BirthdayParts=['','',''];

test('birthday fields advance as each one completes and overflow into the next',()=>{
 assert.deepEqual(typeBirthday(empty,0,'0'),{parts:['0','',''],focus:0});
 assert.deepEqual(typeBirthday(['0','',''],0,'06'),{parts:['06','',''],focus:1});
 assert.deepEqual(typeBirthday(empty,0,'6'),{parts:['6','',''],focus:1});
 assert.deepEqual(typeBirthday(['6','',''],1,'5'),{parts:['6','5',''],focus:2});
 assert.deepEqual(typeBirthday(['12','',''],1,'1'),{parts:['12','1',''],focus:1});
 assert.deepEqual(typeBirthday(empty,0,'06151995'),{parts:['06','15','1995'],focus:2});
 assert.deepEqual(typeBirthday(empty,0,'6151995'),{parts:['6','15','1995'],focus:2});
 assert.deepEqual(typeBirthday(['06','15','1995'],2,'199'),{parts:['06','15','199'],focus:2});
 assert.deepEqual(typeBirthday(['06','15',''],1,''),{parts:['06','',''],focus:1});
});

test('a pasted full date fills every field',()=>{
 assert.deepEqual(typeBirthday(empty,0,'1995-06-15'),{parts:['06','15','1995'],focus:2});
 assert.deepEqual(typeBirthday(empty,1,'6/5/2001'),{parts:['6','5','2001'],focus:2});
});

test('the fields join into an ISO birthday only when complete',()=>{
 assert.equal(joinBirthday(['6','5','1995']),'1995-06-05');
 assert.equal(joinBirthday(empty),'');
 assert.equal(joinBirthday(['6','5','199']),undefined);
 assert.equal(joinBirthday(['','5','1995']),undefined);
});
