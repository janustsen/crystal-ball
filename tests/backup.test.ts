import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeBackup,validPrediction,validFacts} from '../src/backup.ts';
import type {AccountState,Prediction} from '../src/types.ts';
const reading:Prediction={id:'12345678-1234-1234-1234-123456789abc',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-09-30T00:00:00Z',label:'Speculative',why:'Practice',facts:{practice:'daily'},sources:[],assumptions:['You keep practicing.'],friend:false};
const local:AccountState={facts:{practice:'weekly'},history:[{...reading,outcome:'yes'}],credits:5,plus:false,usage:{day:'2026-09-30',count:1},reduceMotion:true,largeText:false};
test('backup merge is idempotent, preserves device edits and never restores entitlements',()=>{
 const remote={facts:{practice:'daily',level:'beginner'},history:[reading,{...reading,id:'22345678-1234-1234-1234-123456789abc'}]};
 const merged=mergeBackup(local,remote);
 assert.equal(merged.history.length,2);assert.equal(merged.history[0].outcome,'yes');assert.equal(merged.facts.practice,'weekly');assert.equal(merged.facts.level,'beginner');
 assert.equal(merged.credits,5);assert.equal(merged.plus,false);assert.deepEqual(merged.usage,local.usage);assert.equal(merged.reduceMotion,true);
 assert.deepEqual(mergeBackup(merged,remote),merged);
});
test('remote JSON cannot silently poison the history UI',()=>{
 assert.equal(validPrediction(reading),true);
 for(const broken of [{...reading,sources:[null]},{...reading,facts:{a:2}},{...reading,createdAt:'bad'},{...reading,id:'bad'},{...reading,assumptions:undefined},{...reading,outcome:'maybe'}])assert.equal(validPrediction(broken),false);
 assert.equal(validFacts(null),false);assert.equal(validFacts({a:'safe'}),true);
});
