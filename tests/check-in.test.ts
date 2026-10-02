import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeActions,type NativePorts} from '../src/integration-actions.ts';
import {localDay,checkInDate} from '../src/retention.ts';

test('automatic check-ins use existing permission; manual reminders can request it',async()=>{
 const requests:boolean[]=[],scheduled:unknown[][]=[];
 let granted=true;
 const ports:NativePorts={platform:'ios',notifications:{clear:async()=>{},
  permission:async(request)=>{requests.push(request);return granted;},
  schedule:async(...args)=>{scheduled.push(args);},
 },share:async()=>{},link:()=>''};
 const actions=nativeActions(ports),date=localDay(new Date(Date.now()+5*86400000));
 const before=Date.now();
 assert.match(await actions.reminder('A future glimpse','saved-reading',date,false),/reminder set/);
 assert.deepEqual(requests,[false]);
 assert.deepEqual(scheduled[0].slice(0,2),['Did it come true?','The ball has a question for you.']);
 assert.equal(scheduled[0][3],'saved-reading');
 assert.ok(Math.abs(Number(scheduled[0][2])-(checkInDate(date)!.getTime()-before)/1000)<2);
 granted=false;
 assert.match(await actions.reminder('A future glimpse','saved-reading',date,false),/off/);
 assert.deepEqual(requests,[false,false]);assert.equal(scheduled.length,1);
 granted=true;
 await actions.reminder('A future glimpse','saved-reading',date);
 assert.deepEqual(requests,[false,false,true]);assert.equal(scheduled.length,2);
 for(const payload of scheduled){assert.equal(payload[1],'The ball has a question for you.');assert.ok(!JSON.stringify(payload).includes('A future glimpse'));}
 ports.platform='web';
 await actions.reminder('A future glimpse','saved-reading',date,false);
 assert.equal(requests.length,3);assert.equal(scheduled.length,2);
 ports.platform='ios';ports.notifications.schedule=async()=>{throw new Error('OS unavailable');};
 assert.match(await actions.reminder('A future glimpse','saved-reading',date,false),/could not be scheduled/);
 ports.notifications.permission=async()=>{throw new Error('Permission unavailable');};
 assert.match(await actions.reminder('A future glimpse','saved-reading',date,false),/could not be scheduled/);
});

test('forget clears existing and in-flight check-ins, preserving later readings',async()=>{
 for(const phase of ['permission','schedule'] as const){
  let release!:()=>void,entered!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve});
  const started=new Promise<void>(resolve=>{entered=resolve});
  const retained=new Set(['existing']),delivered=new Set(['delivered']);
  let pause=true;
  const ports:NativePorts={platform:'ios',notifications:{
   clear:async()=>{retained.clear();delivered.clear();},
   permission:async()=>{if(pause&&phase==='permission'){entered();await gate;}return true;},
   schedule:async(_title,_body,_seconds,id)=>{if(pause&&phase==='schedule'){entered();await gate;}retained.add(id!);},
  },share:async()=>{},link:()=>''};
  const actions=nativeActions(ports);
  const pending=actions.reminder('Private forecast','old');
  await started;
  const forgetting=actions.forgetCheckIns();
  release();await Promise.all([pending,forgetting]);
  assert.equal(retained.size,0,phase);assert.equal(delivered.size,0,phase);
  pause=false;
  await actions.reminder('New forecast','new',undefined,false);
  assert.deepEqual([...retained],['new']);
  ports.notifications.clear=async()=>{throw new Error('OS cleanup failed');};
  await assert.rejects(actions.forgetCheckIns(),/OS cleanup failed/);
  ports.platform='web';await actions.forgetCheckIns();
 }
});

import {checkInLabel} from '../src/retention.ts';
import type {Prediction} from '../src/types.ts';
test('saved verdicts override the due-date prompt in History',()=>{
 const reading:Prediction={id:'reading',createdAt:'2026-09-01T12:00:00',question:'Will I finish?',headline:'You will finish.',label:'Speculative',why:'',facts:{},sources:[],assumptions:[],friend:false};
 for(const dueDate of ['2026-09-29','2026-09-30','2026-10-01']){
  assert.equal(checkInLabel({...reading,dueDate,outcome:'pending'},'2026-09-30'),'◷ Waiting');
  assert.equal(checkInLabel({...reading,dueDate,outcome:'yes'},'2026-09-30'),'✓ Came true');
  assert.equal(checkInLabel({...reading,dueDate,outcome:'no'},'2026-09-30'),'Took another path');
  assert.equal(checkInLabel({...reading,dueDate},'2026-09-30'),dueDate<='2026-09-30'?'Did it come true?':'◷ Waiting');
 }
});
