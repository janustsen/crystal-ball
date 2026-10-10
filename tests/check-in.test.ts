import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as ritual from '../src/ritual';
import * as retention from '../src/retention';

const reading={id:'reading',createdAt:'2026-10-01T12:00:00',question:'Private question',headline:'Private forecast',label:'',why:'',facts:{},sources:[],assumptions:[],friend:false,dueDate:'2026-10-10'};
function fixture(disk=new Map<string,string>(),pending=new Map<string,any>([['check-in-legacy',{identifier:'check-in-legacy'}]])){
 const storage={getItem:async(key:string)=>disk.get(key)??null,setItem:async(key:string,value:string)=>{disk.set(key,value)}};
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
 runInNewContext(code,{module,exports:module.exports,Date,require:(name:string)=>({'@react-native-async-storage/async-storage':{__esModule:true,default:storage},'react-native':{Platform:{get OS(){return platform}}},'expo-notifications':notifications,'./ritual':ritual,'./retention':retention} as Record<string,unknown>)[name]});
 return {api:module.exports,disk,storage,pending,permissions,notifications,deny:()=>{granted=false},web:()=>{platform='web'},cleared:()=>cleared};
}
const account=()=>({sunSign:null,ritual:{...ritual.emptyRitual(),notify:{daily:true,time:'08:30'}},history:[reading,{...reading,id:'friend',friend:true}]});

test('automatic and manual scheduling share the budget and replace legacy reminders',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,9,8)});
 const f=fixture(),state=account();
 await f.api.scheduleRitual(state);
 assert.deepEqual(f.permissions,[false]);
 assert.ok(!f.pending.has('check-in-legacy'));
 const before=f.pending.size;
 assert.match(await f.api.requestCheckIn(()=>state,'reading'),/reminder set/);
 assert.equal(f.pending.size,before);
 for(const day of ['2026-10-10','2026-10-13']){
  const due=[...f.pending.values()].filter(p=>retention.localDay(p.trigger.date)===day);
  assert.ok(due.length<=2);
  assert.equal(due.filter(p=>p.content.data.checkIns).length,day==='2026-10-10'?1:0);
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
  await f.api.scheduleRitual(answered);
  assert.ok(![...f.pending.values()].some(p=>p.content.data.checkIns));
  assert.match(await f.api.requestCheckIn(()=>answered,'reading'),/check-in is saved/);
  await f.api.scheduleRitual({...answered,history:[answered.history[0],state.history[1]]});
  assert.equal([...f.pending.values()].filter(p=>p.content.data.checkIns).length,1);
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
  const pending=f.api.scheduleRitual(state);await started;
  const cleanup=action==='forget'?f.api.forgetNotifications():f.api.scheduleRitual({...state,history:state.history.map(p=>({...p,outcome:'yes' as const}))});
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


for(const restart of [false,true])test(`delivered morning consumes the budget after a time change, restart=${restart}`,async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,10,8)});
 let f=fixture();const state=account(),delivered:any[]=[];
 await f.api.scheduleRitual(state);
 const fire=()=>{for(const [id,p] of f.pending)if(p.trigger.date.getTime()<=Date.now()){delivered.push(p);f.pending.delete(id)}};
 t.mock.timers.setTime(new Date(2026,9,10,9).getTime());fire();
 assert.equal(delivered.length,1);
 if(restart)f=fixture(f.disk,f.pending);
 state.ritual.notify.time='12:30';
 await f.api.scheduleRitual(state);
 assert.equal([...f.pending.values()].filter(p=>retention.localDay(p.trigger.date)==='2026-10-10').length,1);
 assert.ok(!f.pending.has('ritual-2026-10-10-morning'));
 await f.api.requestCheckIn(()=>state,'reading');
 await f.api.testNotification(state);
 t.mock.timers.setTime(new Date(2026,9,10,20).getTime());fire();
 await f.api.scheduleRitual(state);
 assert.equal(delivered.length,2);
 assert.ok(![...f.pending.values()].some(p=>retention.localDay(p.trigger.date)==='2026-10-10'));
 await f.api.forgetNotifications();
 t.mock.timers.setTime(new Date(2026,9,10,20,10).getTime());
 assert.equal(await f.api.testNotification(state),false);
 const preview=await f.api.previewNotifications(state);
 assert.ok(!preview.some((p:any)=>retention.localDay(p.at)==='2026-10-10'));
});

test('failed persistence never schedules an unaccounted notification',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,10,8)});
 const f=fixture();let writes=0;
 const save=f.storage.setItem;
 f.storage.setItem=async(key,value)=>{if(++writes===3)throw new Error('disk full');await save(key,value)};
 await assert.rejects(f.api.scheduleRitual(account()),/disk full/);
 assert.equal(f.pending.size,0);
});

test('quiet hours and the daily budget apply to debug notifications too',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,10,21)});
 const f=fixture();
 assert.equal(await f.api.testNotification(account()),false);
 assert.ok([...f.pending.values()].every(p=>p.trigger.date.getHours()>=8&&p.trigger.date.getHours()<21));
});


test('manual reminders do not bypass back-off or claim a suppressed reminder was set',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,9,8)});
 const f=fixture(),state={...account(),history:[{...reading,dueDate:'2026-10-20'}]};
 assert.match(await f.api.requestCheckIn(()=>state,'reading'),/No reminder scheduled/);
 assert.ok(![...f.pending.values()].some(p=>p.content.data.checkIns));
});

for(const failAt of [1,2])for(const accepted of [false,true])test(`failed scheduling reserves only attempted notifications, failAt=${failAt}, accepted=${accepted}`,async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,9,8)});
 let f=fixture();const state=account(),schedule=f.notifications.scheduleNotificationAsync;
 const attempted:string[]=[];
 f.notifications.scheduleNotificationAsync=async value=>{
  attempted.push(value.identifier);
  if(attempted.length<failAt||accepted)await schedule(value);
  if(attempted.length===failAt)throw new Error('native failure');
 };
 await assert.rejects(f.api.scheduleRitual(state),/native failure/);
 const budget=JSON.parse([...f.disk.values()][0]);
 assert.deepEqual(Object.keys(budget.scheduled),attempted);
 t.mock.timers.setTime(new Date(2026,9,10,9).getTime());
 f=fixture(f.disk,f.pending);state.ritual.notify.time='12:30';
 const preview=await f.api.previewNotifications(state);
 assert.ok(preview.some((p:any)=>p.id==='ritual-2026-10-10-morning'));
 await f.api.scheduleRitual(state);
 assert.ok(f.pending.has('ritual-2026-10-10-morning'));
 const saved=JSON.parse([...f.disk.values()][0]);
 assert.ok(Object.values(saved.delivered).some((ids:any)=>ids.includes(attempted.at(-1))));
 assert.equal(saved.delivered['2026-10-10'],undefined);
});

for(const action of ['replan','forget'])test(`completed cancellations release reservations before later deadlines during ${action}`,async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,10,8)});
 const f=fixture(),state=account();
 await f.api.scheduleRitual(state);
 const cancel=f.notifications.cancelScheduledNotificationAsync;
 let calls=0;
 f.notifications.cancelScheduledNotificationAsync=async id=>{
  await cancel(id);
  if(++calls===2)t.mock.timers.setTime(new Date(2026,9,10,9).getTime());
 };
 state.ritual.notify.time='12:30';
 if(action==='forget')await f.api.forgetNotifications();else await f.api.scheduleRitual(state);
 const saved=JSON.parse([...f.disk.values()][0]);
 assert.equal(saved.delivered['2026-10-10'],undefined);
 const preview=await f.api.previewNotifications(state);
 assert.ok(preview.some((p:any)=>p.id==='ritual-2026-10-10-morning'));
 await f.api.scheduleRitual(state);
 assert.ok(f.pending.has('ritual-2026-10-10-morning'));
});

test('a deadline crossed during cancellation remains potentially delivered',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,10,8)});
 const f=fixture(),state=account();await f.api.scheduleRitual(state);
 const cancel=f.notifications.cancelScheduledNotificationAsync;
 f.notifications.cancelScheduledNotificationAsync=async id=>{
  t.mock.timers.setTime(new Date(2026,9,10,9).getTime());await cancel(id);
 };
 await f.api.forgetNotifications();state.ritual.notify.time='12:30';
 const preview=await f.api.previewNotifications(state);
 assert.ok(!preview.some((p:any)=>p.id==='ritual-2026-10-10-morning'));
});
