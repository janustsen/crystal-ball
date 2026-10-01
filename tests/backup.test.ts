import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeBackup,validPrediction,validFacts,trackBackupDeletion,pendingBackupDeletion,acknowledgeBackup} from '../src/backup.ts';
import type {AccountState,Prediction} from '../src/types.ts';
const reading:Prediction={id:'12345678-1234-1234-1234-123456789abc',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-09-30T00:00:00Z',label:'Speculative',why:'Practice',facts:{practice:'daily'},sources:[],assumptions:['You keep practicing.'],friend:false};
const local:AccountState={backupOwner:'apple-owner',facts:{practice:'weekly'},history:[{...reading,outcome:'yes'}],credits:5,plus:false,usage:{day:'2026-09-30',count:1},reduceMotion:true,largeText:false};
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

test('deletion tracking survives edits, Undo, new readings and serialization',()=>{
 const forgotten=trackBackupDeletion(local,{...local,facts:{}});
 assert.equal(pendingBackupDeletion(forgotten),true);
 const undone=trackBackupDeletion(JSON.parse(JSON.stringify(forgotten)),local);
 assert.equal(pendingBackupDeletion(undone),true);assert.deepEqual(undone.facts,local.facts);
 assert.equal(pendingBackupDeletion(trackBackupDeletion(local,{...local,history:[]})),true);
 assert.equal(pendingBackupDeletion(trackBackupDeletion(local,{...local,largeText:true})),false);
 assert.equal(pendingBackupDeletion(trackBackupDeletion(local,{...local,facts:{practice:'daily'}})),false);
 assert.equal(pendingBackupDeletion(trackBackupDeletion(forgotten,{...forgotten,history:[...forgotten.history,{...reading,id:'22345678-1234-1234-1234-123456789abc'}]})),true);
});

test('receipts acknowledge only their owner and revision; local-only forgetting has no remote authority',()=>{
 const first=trackBackupDeletion(local,{...local,facts:{}});
 const second=trackBackupDeletion(first,{...first,history:[]});
 const receipt={owner:'apple-owner',revision:first.backupRevision!};
 assert.equal(pendingBackupDeletion(acknowledgeBackup(first,receipt)),false);
 assert.equal(pendingBackupDeletion(acknowledgeBackup(second,receipt)),true);
 assert.deepEqual(acknowledgeBackup(second,{...receipt,owner:'other-owner'}),second);
 const unowned={...local,backupOwner:undefined};
 assert.equal(pendingBackupDeletion(trackBackupDeletion(unowned,{...unowned,facts:{},history:[]},true)),false);
});
