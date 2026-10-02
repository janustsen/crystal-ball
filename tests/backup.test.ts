import test from 'node:test';
import assert from 'node:assert/strict';
import {validPrediction,validFacts} from '../src/backup.ts';
const reading={id:'12345678-1234-1234-1234-123456789abc',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-09-30T00:00:00Z',label:'Speculative',why:'Practice',facts:{practice:'daily'},sources:[],assumptions:['You keep practicing.'],friend:false};
test('remote JSON cannot silently poison the history UI',()=>{
 assert.equal(validPrediction(reading),true);
 for(const broken of [{...reading,sources:[null]},{...reading,facts:{a:2}},{...reading,createdAt:'bad'},{...reading,id:'bad'},{...reading,assumptions:undefined},{...reading,outcome:'maybe'}])assert.equal(validPrediction(broken),false);
 assert.equal(validFacts(null),false);assert.equal(validFacts({a:'safe'}),true);
});
