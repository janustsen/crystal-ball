import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {nativeActions} from '../src/integration-actions';
import * as retention from '../src/retention';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function nativeFixture(){
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
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]});
 return {api:module.exports,scheduled,grant:()=>{granted=true;},foreground:()=>foreground?.('active'),tap:(data:any,cold=false)=>{const value={notification:{request:{content:{data}}}};if(cold)last=value;else response?.(value);}};
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
