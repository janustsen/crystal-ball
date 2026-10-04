import test from 'node:test';
import assert from 'node:assert/strict';
import {checkInDueDate,forecastDueDate} from '../src/due-date';
import {nativeActions,type NativePorts} from '../src/integration-actions';
import {checkInDate} from '../src/retention';

test('check-ins clamp both bounds without shortening the forecast horizon',()=>{
 assert.equal(checkInDueDate('this year','2026-12-31'),'2027-01-01');
 assert.equal(checkInDueDate('this week','2026-10-04'),'2026-10-05');
 assert.equal(checkInDueDate('in 10 years','2026-10-03'),'2027-10-03');
 assert.equal(checkInDueDate('in 1 year','2028-02-29'),'2029-02-28');
 assert.equal(checkInDueDate('tomorrow','2026-10-03'),'2026-10-04');
 assert.equal(checkInDueDate('in 6 months','2026-10-03'),'2027-04-03');
 assert.equal(forecastDueDate('in 10 years','2026-10-03'),'2036-10-03');
});

test('fake clock: due date, one reminder three days later, then silence; answers cancel both',async t=>{
 const now=new Date('2026-10-03T12:00:00').getTime();
 t.mock.timers.enable({apis:['Date'],now});
 const queued=new Map<string,{at:number;id:string}>(),delivered:string[]=[];
 const ports:NativePorts={platform:'ios',notifications:{
  clear:async()=>queued.clear(),permission:async()=>true,
  cancel:async id=>{for(const [key,value] of queued)if(value.id===id)queued.delete(key)},
  schedule:async(_title,_body,seconds,id,followUp)=>{queued.set(`${id}-${!!followUp}`,{at:Date.now()+seconds*1000,id:id!})},
 },share:async()=>{},link:()=>''};
 const actions=nativeActions(ports);
 const advance=(time:number)=>{t.mock.timers.setTime(time);for(const [key,value] of queued)if(value.at<=time){delivered.push(key);queued.delete(key)}};
 const due=checkInDate('2026-10-05')!,followUp=new Date(due);followUp.setDate(followUp.getDate()+3);
 await actions.reminder('Private words','unanswered','2026-10-05',false);
 await actions.reminder('Private words','unanswered','2026-10-05');
 assert.equal(queued.size,2,'manual scheduling replaces, never adds a third notification');
 advance(due.getTime()-1);assert.deepEqual(delivered,[]);
 advance(due.getTime());assert.deepEqual(delivered,['unanswered-false']);
 advance(followUp.getTime()-1);assert.equal(delivered.length,1);
 advance(followUp.getTime());assert.deepEqual(delivered,['unanswered-false','unanswered-true']);
 advance(now+400*86400000);assert.equal(delivered.length,2);assert.equal(queued.size,0);
 for(const verdict of ['yes','no','pending']){
  t.mock.timers.setTime(now);
  await actions.reminder('',verdict,'2026-10-05',false);
  advance(due.getTime());
  await actions.cancelCheckIn(verdict);
  assert.equal(queued.size,0);
  assert.match(await actions.reminder('',verdict,'2026-10-05'),/check-in is saved/);
 }
});

test('answer while permission or scheduling is pending leaves no reminder',async()=>{
 for(const phase of ['permission','schedule']){
  let release!:()=>void,entered!:()=>void;
  const gate=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
  const queued=new Set<string>();let held=false;
  const hold=async()=>{if(!held){held=true;entered();await gate}};
  const actions=nativeActions({platform:'ios',notifications:{clear:async()=>{},
   cancel:async()=>{queued.clear()},permission:async()=>{if(phase==='permission')await hold();return true},
   schedule:async(_t,_b,_s,_id,followUp)=>{if(phase==='schedule')await hold();queued.add(String(followUp))},
  },share:async()=>{},link:()=>''});
  const scheduling=actions.reminder('','reading');await started;
  const answering=actions.cancelCheckIn('reading');release();await Promise.all([scheduling,answering]);
  assert.equal(queued.size,0,phase);
 }
});

test('restored unanswered readings reopen reminders without clearing other saved answers',async()=>{
 for(const platform of ['ios','web']){
  const scheduled:unknown[][]=[];
  const actions=nativeActions({platform,notifications:{clear:async()=>{},cancel:async()=>{},permission:async()=>true,schedule:async(...args)=>{scheduled.push(args)}},share:async()=>{},link:()=>''});
  await actions.cancelCheckIn('restored');await actions.cancelCheckIn('still-answered');
  assert.match(await actions.reminder('','restored'),/check-in is saved/);
  actions.reopenCheckIn('restored');
  assert.match(await actions.reminder('','restored'),platform==='ios'?/reminder set/:/No reminder scheduled in this browser/);
  assert.equal(scheduled.length,platform==='ios'?2:0);
  assert.match(await actions.reminder('','still-answered'),/check-in is saved/);
  await actions.cancelCheckIn('restored');
  assert.match(await actions.reminder('','restored'),/check-in is saved/);
 }
});
