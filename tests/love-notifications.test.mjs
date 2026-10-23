import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import * as ritual from '../src/ritual.ts';
import * as retention from '../src/retention.ts';

const now=new Date(2026,9,7,9);
const dates=['2026-10-21','2026-11-07','2027-01-07','2027-04-07','2027-10-07'];
const reading={id:'love',timing:'love',createdAt:now.toISOString(),dueDate:dates[0],question:'Private question',headline:'Private headline',facts:{},friend:false};
const account=(history=[reading])=>({sunSign:null,ritual:{...ritual.emptyRitual(),notify:{daily:true,time:'08:30'}},history});

test('Love timing is planned today for every horizon without another open',()=>{
 for(const dueDate of dates){
  const state=account([{...reading,dueDate}]);
  const plan=ritual.planNotifications(state,now);
  const reminders=plan.filter(p=>p.data.checkIns);
  assert.equal(reminders.length,1);
  assert.equal(retention.localDay(reminders[0].at),dueDate);
  assert.equal(reminders[0].at.getHours(),19);
  assert.equal(reminders[0].at.getMinutes(),30);
  assert.equal(reminders[0].title,'The day the Ball named');
  assert.ok(!JSON.stringify(reminders).includes('Private'));
  assert.deepEqual(plan.filter(p=>!p.data.checkIns),ritual.planNotifications(account([]),now));
  assert.deepEqual(ritual.planNotifications(account([{...reading,timing:undefined,dueDate}]),now).filter(p=>p.data.checkIns),[]);
  assert.deepEqual(ritual.planNotifications(state,new Date(`${dueDate}T20:00:00`)).filter(p=>p.data.checkIns).map(p=>retention.localDay(p.at)),[retention.localDay(new Date(new Date(`${dueDate}T12:00:00`).getTime()+3*86400000))]);
 }
});

async function fixture(os='ios',clock=now){
 let current=clock.getTime(),handler;
 class Clock extends Date{constructor(...args){super(...(args.length?args:[current]))}static now(){return current}}
 const pending=new Map(),disk=new Map();
 const notifications={setNotificationHandler(value){handler=value},SchedulableTriggerInputTypes:{DATE:'date'},getPermissionsAsync:async()=>({status:'granted'}),requestPermissionsAsync:async()=>({status:'granted'}),getAllScheduledNotificationsAsync:async()=>[...pending.values()],cancelScheduledNotificationAsync:async id=>{pending.delete(id)},scheduleNotificationAsync:async value=>{pending.set(value.identifier,value)},dismissAllNotificationsAsync:async()=>{},clearLastNotificationResponseAsync:async()=>{}};
 const imports={'react-native':{Platform:{OS:os}},'expo-notifications':notifications,'@react-native-async-storage/async-storage':{default:{getItem:async key=>disk.get(key)??null,setItem:async(key,value)=>{disk.set(key,value)}}},'./ritual':ritual,'./retention':retention};
 const context=createContext({Date:Clock});
 const clockedRetention=new SourceTextModule(stripTypeScriptTypes(readFileSync(new URL('../src/retention.ts',import.meta.url),'utf8')),{context});
 await clockedRetention.link(()=>{throw new Error('Unexpected retention import')});
 await clockedRetention.evaluate();
 imports['./retention']=clockedRetention.namespace;
 const module=new SourceTextModule(stripTypeScriptTypes(readFileSync(new URL('../src/notify.ts',import.meta.url),'utf8')),{context});
 await module.link(name=>new SyntheticModule(Object.keys(imports[name]),function(){for(const [key,value]of Object.entries(imports[name]))this.setExport(key,value)},{context}));
 await module.evaluate();
 return {api:module.namespace,pending,receive:data=>handler.handleNotification({request:{content:{data}}}),advance:date=>{current=date.getTime()}};
}

test('native scheduling, manual requests, previews and cleanup include distant Love timing reminders',async()=>{
 const f=await fixture(),state=account(dates.map((dueDate,i)=>({...reading,id:`love-${i}`,dueDate})));
 const plan=await f.api.scheduleRitual(state);
 const reminders=plan.filter(p=>p.data.checkIns);
 assert.deepEqual(reminders.map(p=>retention.localDay(p.at)),dates);
 for(const p of reminders){
  const native=f.pending.get(p.id);
  assert.equal(native.trigger.type,'date');
  assert.equal(native.trigger.date.getTime(),p.at.getTime());
 }
 assert.match(await f.api.requestCheckIn(()=>state,'love-4'),/reminder set/);
 assert.deepEqual((await f.api.previewNotifications(state)).map(p=>p.id),plan.map(p=>p.id));
 for(const outcome of ['yes','no','pending']){
  await f.api.scheduleRitual({...state,history:state.history.map(p=>({...p,outcome}))});
  assert.ok(![...f.pending.values()].some(p=>p.content.data.checkIns));
  await f.api.scheduleRitual(state);
 }
 await f.api.scheduleRitual({...state,history:state.history.map(p=>({...p,circleId:'circle'}))});
 assert.ok(![...f.pending.values()].some(p=>p.content.data.checkIns));
 await f.api.scheduleRitual(state);
 await f.api.forgetNotifications();
 assert.equal(f.pending.size,0);
});

for(const os of ['ios','android'])test(`${os} reminder requests skip answered readings, including Not yet`,async()=>{
 const f=await fixture(os),open={...reading,id:'open'},state=account([open]);
 assert.match(await f.api.requestCheckIn(()=>state,'open'),/reminder set/);
 assert.ok([...f.pending.values()].some(p=>p.content.data.checkIns));
 for(const outcome of ['yes','no','pending']){
  const answered={...state,history:[{...open,outcome}]};
  assert.match(await f.api.requestCheckIn(()=>answered,'open'),/check-in is saved/);
  assert.ok(!(await f.api.scheduleRitual(answered)).some(p=>p.data.checkIns));
  assert.ok(![...f.pending.values()].some(p=>p.content.data.checkIns));
  await f.api.scheduleRitual(state);
 }
});

for(const os of ['ios','android'])test(`${os} Friday push received in-app cancels only its local fallback and survives replanning`,async()=>{
 const f=await fixture(os,new Date(2026,9,9,19,59));
 const state=account([]);state.ritual.notify.sky=true;
 const id='ritual-2026-10-09-friday-sky';
 await f.api.scheduleRitual(state);
 assert.ok(f.pending.has(id));
 const before=[...f.pending.keys()].filter(key=>key!==id);
 const first=await f.receive({social:true,sky:true});
 assert.equal(first.shouldShowBanner,true);
 assert.equal(first.shouldShowList,true);
 assert.ok(!f.pending.has(id));
 assert.deepEqual([...f.pending.keys()],before);
 const duplicate=await f.receive({social:true,sky:true});
 assert.equal(duplicate.shouldShowBanner,false);
 assert.equal(duplicate.shouldShowList,false);
 await f.api.scheduleRitual(state);
 assert.ok(!f.pending.has(id),'replanning cannot restore the consumed fallback');
 assert.ok([...f.pending.keys()].some(key=>key==='ritual-2026-10-16-friday-sky'),'next Friday is independent');
 assert.equal((await f.receive({social:true,circle:'circle'})).shouldShowBanner,true);
});

test('a local Friday that is already due suppresses a later foreground remote delivery',async()=>{
 const f=await fixture('ios',new Date(2026,9,9,19,59));
 const state=account([]);state.ritual.notify.sky=true;
 await f.api.scheduleRitual(state);
 assert.ok(f.pending.has('ritual-2026-10-09-friday-sky'),'APNs failure leaves a scheduled fallback');
 f.advance(new Date(2026,9,9,20,1));
 assert.equal((await f.receive({social:true,sky:true})).shouldShowBanner,false);
 assert.equal((await f.receive({ritual:'sky'})).shouldShowBanner,false);
});
