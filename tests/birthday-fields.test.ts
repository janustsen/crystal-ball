import test from 'node:test';
import assert from 'node:assert/strict';
import {typeBirthday,joinBirthday,type BirthdayParts} from '../src/profile.ts';
const empty:BirthdayParts=['','',''];

test('birthday fields advance as each one completes',()=>{
 assert.deepEqual(typeBirthday(empty,0,'0'),{parts:['0','',''],focus:0});
 assert.deepEqual(typeBirthday(['0','',''],0,'06'),{parts:['06','',''],focus:1});
 for(let digit=2;digit<=9;digit++)assert.deepEqual(typeBirthday(empty,0,String(digit)),{parts:[String(digit),'',''],focus:1});
 for(let digit=4;digit<=9;digit++)assert.deepEqual(typeBirthday(['6','',''],1,String(digit)),{parts:['6',String(digit),''],focus:2});
 for(const digit of ['0','1','2','3'])assert.deepEqual(typeBirthday(['12','',''],1,digit),{parts:['12',digit,''],focus:1});
 assert.deepEqual(typeBirthday(empty,0,'1'),{parts:['1','',''],focus:0});
 const month=typeBirthday(empty,0,'06');
 const day=typeBirthday(month.parts,month.focus,'15');
 assert.equal(day.focus,2);
 const year=typeBirthday(day.parts,day.focus,'1995');
 assert.deepEqual(year,{parts:['06','15','1995'],focus:2});
 assert.equal(joinBirthday(year.parts),'1995-06-15');
 assert.deepEqual(typeBirthday(year.parts,2,'199'),{parts:['06','15','199'],focus:2});
});

test('edits keep only field-local digits and preserve sibling fields',()=>{
 const original:BirthdayParts=['06','15','1995'];
 for(const [index,width] of [2,2,4].entries()){
  for(const text of ['','a1b2c3d4e5','06151995','6151995','1995-06-15','6/5/2001']){
   const expected=[...original];expected[index]=text.replace(/\D/g,'').slice(0,width);
   const result=typeBirthday(original,index,text);
   assert.deepEqual(result.parts,expected);
   assert.equal(result.focus,text===''?index:Math.min(index+1,2));
   assert.deepEqual(original,['06','15','1995']);
  }
 }
});

test('the fields join into an ISO birthday only when complete',()=>{
 assert.equal(joinBirthday(['6','5','1995']),'1995-06-05');
 assert.equal(joinBirthday(empty),'');
 assert.equal(joinBirthday(['6','5','199']),undefined);
 assert.equal(joinBirthday(['','5','1995']),undefined);
});
