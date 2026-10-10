import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as ritual from '../src/ritual';
import * as retention from '../src/retention';

const reading={id:'reading',createdAt:'2026-10-01T12:00:00',question:'Private question',headline:'Private forecast',label:'',why:'',facts:{},sources:[],assumptions:[],friend:false,dueDate:'2026-10-10'};
function fixture(){
 const pending=new Map<string,any>([['check-in-legacy',{identifier:'check-in-legacy'}]]);
 const permissions:boolean[]=[];let granted=true,platform='ios',cleared=0;
 const notifications={
  setNotificationHandler(){},SchedulableTriggerInputTypes:{DATE:'date'},
  requestPermissionsAsync:async()=>{permissions.push(true);return {status:granted?'granted':'denied'}},
  getPermissionsAsync:async()=>{permissions.push(false);return {status:granted?'granted':'denied'}},
  getAllScheduledNotificationsAsync:async()=>[...pending.values()],
  cancelScheduledNotificationAsync:async(id:string)=>{pending.delete(id)},
  scheduleNotificationAsync:async(value:any)=>{pending.set(value.identifier,value)},
  cancelAllScheduledNotificationsAsync:async()=>{pending.clear()},dismissAllNotificationsAsync:async()=>{cleared++},clearLastNotificationResponseAsync:async()=>{},
 };
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL('../src/notify.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>({'react-native':{Platform:{get OS(){return platform}}},'expo-notifications':notifications,'./ritual':ritual,'./retention':retention} as Record<string,unknown>)[name]});
 return {api:module.exports,pending,permissions,notifications,deny:()=>{granted=false},web:()=>{platform='web'},cleared:()=>cleared};
}
const account=()=>({sunSign:null,ritual:{...ritual.emptyRitual(),notify:{daily:true,time:'08:30'}},history:[reading,{...reading,id:'friend',friend:true}]});

test('automatic and manual scheduling share the budget and replace legacy reminders',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,9,8)});
 const f=fixture(),state=account(),plan=ritual.planNotifications(state);
 await f.api.scheduleRitual(plan);
 assert.deepEqual(f.permissions,[false]);
 assert.ok(!f.pending.has('check-in-legacy'));
 const before=f.pending.size;
 assert.match(await f.api.requestCheckIn(()=>state,'reading'),/reminder set/);
 assert.equal(f.pending.size,before);
 for(const day of ['2026-10-10','2026-10-13']){
  const due=[...f.pending.values()].filter(p=>retention.localDay(p.trigger.date)===day);
  assert.ok(due.length<=2);
  assert.equal(due.filter(p=>p.content.data.checkIns).length,1);
  assert.ok(due.every(p=>!JSON.stringify(p).includes('Private')));
 }
 f.deny();assert.match(await f.api.requestCheckIn(()=>state,'reading'),/off/);
 f.web();assert.match(await f.api.requestCheckIn(()=>state,'reading'),/preview/);
});

test('answers remove grouped check-ins only after the last unanswered forecast; restore reinstates them',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,9,8)});
 const f=fixture(),state=account();
 for(const outcome of ['yes','no','pending'] as const){
  const answered={...state,history:state.history.map(p=>({...p,outcome}))};
  await f.api.scheduleRitual(ritual.planNotifications(answered));
  assert.ok(![...f.pending.values()].some(p=>p.content.data.checkIns));
  assert.match(await f.api.requestCheckIn(()=>answered,'reading'),/check-in is saved/);
  await f.api.scheduleRitual(ritual.planNotifications({...answered,history:[answered.history[0],state.history[1]]}));
  assert.equal([...f.pending.values()].filter(p=>p.content.data.checkIns).length,2);
 }
});

test('an answer or forget queued during scheduling runs last and removes pending notifications',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,9,8)});
 for(const action of ['answer','forget']){
  const f=fixture(),state=account();
  let release!:()=>void,entered!:()=>void,held=false;
  const gate=new Promise<void>(resolve=>{release=resolve}),started=new Promise<void>(resolve=>{entered=resolve});
  const schedule=f.notifications.scheduleNotificationAsync;
  f.notifications.scheduleNotificationAsync=async value=>{if(!held){held=true;entered();await gate}await schedule(value)};
  const pending=f.api.scheduleRitual(ritual.planNotifications(state));await started;
  const cleanup=action==='forget'?f.api.forgetNotifications():f.api.scheduleRitual(ritual.planNotifications({...state,history:state.history.map(p=>({...p,outcome:'yes' as const}))}));
  release();await Promise.all([pending,cleanup]);
  assert.ok(![...f.pending.values()].some(p=>p.content.data.checkIns));
  if(action==='forget'){assert.equal(f.pending.size,0);assert.equal(f.cleared(),1)}
 }
});

test('manual permission uses the latest archive after an answer or reset',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,9,8)});
 const f=fixture();let state=account(),release!:(value:{status:string})=>void;
 f.notifications.requestPermissionsAsync=()=>new Promise(resolve=>{release=resolve});
 const pending=f.api.requestCheckIn(()=>state,'reading');
 state={...state,history:[]};release({status:'granted'});
 assert.match(await pending,/check-in is saved/);
 assert.equal(f.pending.size,1);
});

import {checkInLabel} from '../src/retention.ts';
import type {Prediction} from '../src/types.ts';
test('saved verdicts override the due-date prompt in History',()=>{
 const reading:Prediction={id:'reading',createdAt:'2026-09-01T12:00:00',question:'Will I finish?',headline:'You will finish.',label:'Speculative',why:'',facts:{},sources:[],assumptions:[],friend:false};
 for(const dueDate of ['2026-09-29','2026-09-30','2026-10-01']){
  assert.equal(checkInLabel({...reading,dueDate,outcome:'pending'},'2026-09-30'),'Not yet');
  assert.equal(checkInLabel({...reading,dueDate,outcome:'yes'},'2026-09-30'),'Yes');
  assert.equal(checkInLabel({...reading,dueDate,outcome:'no'},'2026-09-30'),'Not quite');
  assert.equal(checkInLabel({...reading,dueDate},'2026-09-30'),dueDate<='2026-09-30'?'Ready to check in':`Check back ${dueDate}`);
 }
});


test('grouped check-in taps open History while legacy taps retain their reading id',()=>{
 for(const data of [{checkIns:'1'},{readingId:'legacy'}]){
  const opened:string[]=[];let cleared=0;
  const notifications={getLastNotificationResponse:()=>({notification:{request:{content:{data}}}}),clearLastNotificationResponseAsync:async()=>{cleared++},addNotificationResponseReceivedListener:()=>({remove(){}})};
  const imports:Record<string,unknown>={'react-native':{Platform:{OS:'ios'}},'expo-notifications':notifications,'./integration-actions':{nativeActions:()=>({})},'./notify':{}};
  const code=ts.transpileModule(readFileSync(new URL('../src/native.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const module={exports:{} as any};runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??{}});
  module.exports.watchCheckIns((id:string)=>opened.push(id))();
  assert.deepEqual(opened,['checkIns' in data?'':'legacy']);assert.equal(cleared,1);
 }
});
