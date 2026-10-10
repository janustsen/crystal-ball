import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {nativeActions} from '../src/integration-actions';
import * as retention from '../src/retention';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function nativeFixture(now=new Date()){
 let granted=false,last:any=null,response:((value:any)=>void)|undefined,foreground:((state:string)=>void)|undefined;
 const scheduled=new Map<string,any>();
 const notifications={
  requestPermissionsAsync:async()=>{granted=true;return {status:'granted'};},
  getPermissionsAsync:async()=>({status:granted?'granted':'denied'}),
  scheduleNotificationAsync:async(value:any)=>{scheduled.set(value.identifier,value);},
  cancelScheduledNotificationAsync:async(id:string)=>{scheduled.delete(id);},
  cancelAllScheduledNotificationsAsync:async()=>{scheduled.clear();},
  dismissAllNotificationsAsync:async()=>{},clearLastNotificationResponseAsync:async()=>{last=null;},
  getLastNotificationResponse:()=>last,
  addNotificationResponseReceivedListener:(fn:(value:any)=>void)=>{response=fn;return {remove:()=>{response=undefined;}};},
  SchedulableTriggerInputTypes:{DATE:'date',WEEKLY:'weekly',TIME_INTERVAL:'interval'},
 };
 const imports:Record<string,unknown>={
  'react-native':{Platform:{OS:'ios'},Share:{},AppState:{addEventListener:(_event:string,fn:(state:string)=>void)=>{foreground=fn;return {remove:()=>{foreground=undefined;}};}}},
  'expo-notifications':notifications,'expo-haptics':{},'expo-linking':{},
  './integration-actions':{nativeActions},'./retention':retention,
 };
 const module={exports:{} as typeof import('../src/native')};
 const code=ts.transpileModule(readFileSync(new URL('../src/native.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name],Date:class extends Date{static now(){return now.getTime();}}});
 return {api:module.exports,scheduled,notifications,grant:()=>{granted=true;},foreground:()=>foreground?.('active'),tap:(data:any,cold=false)=>{const value={notification:{request:{content:{data}}}};if(cold)last=value;else response?.(value);}};
}

test('ritual schedules reconcile on reminder and social permission grants, foreground and forget',async()=>{
 for(const trigger of ['reminder','social','foreground']){
  const f=nativeFixture(),day=retention.localDay(),stop=f.api.watchRitualReminders([{day,text:'Private whisper'}]);
  await tick();assert.equal(f.scheduled.size,0);
  if(trigger==='reminder')await f.api.reminder('Private question','reading');
  if(trigger==='social')await f.api.requestNotificationPermission();
  if(trigger==='foreground'){f.grant();f.foreground();}
  await tick();
  const whisper=f.scheduled.get(`whisper-check-${day}`),recap=f.scheduled.get('week-recap');
  assert.equal(whisper.content.data.destination,'whisper');assert.equal(whisper.trigger.date.getHours(),8);
  assert.equal(recap.content.data.destination,'recap');assert.equal(recap.trigger.hour,18);
  assert.ok(!JSON.stringify([...f.scheduled.values()]).includes('Private'));
  stop();await f.api.forgetCheckIns();
  assert.deepEqual([...f.scheduled.keys()],['week-recap']);
  f.scheduled.clear();f.foreground();await f.api.requestNotificationPermission();await tick();assert.equal(f.scheduled.size,0);
 }
});

test('both cold and running notification responses route rituals and preserve reading links',()=>{
 for(const cold of [true,false])for(const data of [{destination:'whisper'},{destination:'recap'},{readingId:'reading'},{social:true}]){
  const f=nativeFixture(),opened:string[]=[];
  if(cold)f.tap(data,true);
  const stop=f.api.watchCheckIns(id=>opened.push(id),destination=>opened.push(destination));
  if(!cold)f.tap(data);
  assert.deepEqual(opened,'social'in data?[]:['readingId'in data?data.readingId:data.destination]);
  stop();f.tap({destination:'recap'});assert.equal(opened.length,'social'in data?0:1);
 }
});

function deferred(){let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}

test('answer, forget and disposal invalidate reconciliation awaiting permission',async()=>{
 for(const action of ['answer','forget','dispose']){
  const f=nativeFixture(new Date(2026,9,9,7)),day='2026-10-08',permission=deferred();
  let checks=0;
  f.notifications.getPermissionsAsync=async()=>{if(++checks===1)await permission.promise;return {status:'granted'};};
  const stop=f.api.watchRitualReminders([{day,text:'Yesterday’s whisper'}]);
  await tick();assert.equal(checks,1);
  let cleanup:Promise<void>|undefined;
  if(action==='answer')f.api.cancelWhisperCheck(day);
  if(action==='forget')cleanup=f.api.forgetCheckIns();
  if(action==='dispose')stop();
  permission.resolve();await cleanup;await tick();
  assert.equal(f.scheduled.has(`whisper-check-${day}`),false);
  assert.deepEqual([...f.scheduled.keys()],action==='forget'?['week-recap']:[]);
  f.foreground();await f.api.requestNotificationPermission();await tick();
  assert.equal(f.scheduled.has(`whisper-check-${day}`),false,'old subscriptions remain invalid after another signal');
  stop();
  const next=f.api.watchRitualReminders([{day,text:'Yesterday’s whisper',outcome:'yes'},{day:'2026-10-09',text:'Today’s whisper'}]);
  await tick();
  assert.equal(f.scheduled.has(`whisper-check-${day}`),false);
  assert.equal(f.scheduled.has('whisper-check-2026-10-09'),true,'the next current snapshot still schedules');
  assert.equal(f.scheduled.has('week-recap'),true);
  next();
 }
});

test('answer and forget wait for an already executing native schedule before cleanup',async()=>{
 for(const action of ['answer','forget']){
  const f=nativeFixture(new Date(2026,9,9,7)),day='2026-10-08',entered=deferred(),finish=deferred();
  f.grant();
  const schedule=f.notifications.scheduleNotificationAsync;
  f.notifications.scheduleNotificationAsync=async value=>{
   if(value.identifier===`whisper-check-${day}`){entered.resolve();await finish.promise;}
   await schedule(value);
  };
  const stop=f.api.watchRitualReminders([{day,text:'Yesterday’s whisper'}]);
  await entered.promise;
  let cleanup:Promise<void>|undefined;
  if(action==='answer')f.api.cancelWhisperCheck(day);else cleanup=f.api.forgetCheckIns();
  finish.resolve();await cleanup;await tick();
  assert.deepEqual([...f.scheduled.keys()],['week-recap']);
  stop();
 }
});

test('disposing a subscription invalidates reconciliation waiting behind native writes',async()=>{
 const f=nativeFixture(new Date(2026,9,9,7)),entered=deferred(),finish=deferred();
 f.grant();
 const schedule=f.notifications.scheduleNotificationAsync;
 let calls=0;
 f.notifications.scheduleNotificationAsync=async value=>{if(++calls===1){entered.resolve();await finish.promise;}await schedule(value);};
 const first=f.api.watchRitualReminders([]);await entered.promise;
 const second=f.api.watchRitualReminders([{day:'2026-10-08',text:'Yesterday’s whisper'}]);
 await tick();second();finish.resolve();await tick();
 assert.equal(calls,1);assert.deepEqual([...f.scheduled.keys()],['week-recap']);
 first();
});
