import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeActions,type NativePorts} from '../src/integration-actions.ts';
import {localDay,checkInDate} from '../src/retention.ts';

test('automatic check-ins use existing permission; manual reminders can request it',async()=>{
 const requests:boolean[]=[],scheduled:unknown[][]=[];
 let granted=true;
 const ports:NativePorts={platform:'ios',notifications:{
  permission:async(request)=>{requests.push(request);return granted;},
  schedule:async(...args)=>{scheduled.push(args);},
 },apple:{available:async()=>false,enabled:false,owner:async()=>null,signIn:async()=>null,link:async()=>undefined},share:async()=>{},link:()=>''};
 const actions=nativeActions(ports),date=localDay(new Date(Date.now()+5*86400000));
 const before=Date.now();
 assert.match(await actions.reminder('A future glimpse','saved-reading',date,false),/reminder set/);
 assert.deepEqual(requests,[false]);
 assert.deepEqual(scheduled[0].slice(0,2),['Did it come true?','A future glimpse']);
 assert.equal(scheduled[0][3],'saved-reading');
 assert.ok(Math.abs(Number(scheduled[0][2])-(checkInDate(date)!.getTime()-before)/1000)<2);
 granted=false;
 assert.match(await actions.reminder('A future glimpse','saved-reading',date,false),/off/);
 assert.deepEqual(requests,[false,false]);assert.equal(scheduled.length,1);
 granted=true;
 await actions.reminder('A future glimpse','saved-reading',date);
 assert.deepEqual(requests,[false,false,true]);assert.equal(scheduled.length,2);
 ports.platform='web';
 await actions.reminder('A future glimpse','saved-reading',date,false);
 assert.equal(requests.length,3);assert.equal(scheduled.length,2);
 ports.platform='ios';ports.notifications.schedule=async()=>{throw new Error('OS unavailable');};
 assert.match(await actions.reminder('A future glimpse','saved-reading',date,false),/could not be scheduled/);
 ports.notifications.permission=async()=>{throw new Error('Permission unavailable');};
 assert.match(await actions.reminder('A future glimpse','saved-reading',date,false),/could not be scheduled/);
});
