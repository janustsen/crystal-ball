import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyOmen,checkInDate,localDay,suggestedCheckIn} from '../src/retention';
import {nativeActions,type NativePorts} from '../src/integration-actions';
import type {Prediction} from '../src/types';
const reading:Prediction={id:'reading-1',createdAt:'2026-01-31T12:00:00',headline:'You will finish within a month.',question:'Will I finish?',label:'Speculative',why:'',facts:{},sources:[],assumptions:[],friend:false};
test('omen stays identical within a local day, rolls at midnight, and uses no account state',()=>{
 assert.deepEqual(dailyOmen(new Date(2026,8,30,0)),dailyOmen(new Date(2026,8,30,23,59)));
 assert.notEqual(dailyOmen(new Date(2026,8,30)).text,dailyOmen(new Date(2026,9,1)).text);
 assert.equal(localDay(new Date(2026,0,1,0)),'2026-01-01');
});
test('existing readings get a date without migration; month-end clamps and invalid dates fail',()=>{
 assert.equal(suggestedCheckIn(reading),'2026-02-28');
 assert.equal(suggestedCheckIn({...reading,headline:'A surprise awaits.'}),'2026-03-02');
 assert.equal(suggestedCheckIn({...reading,checkInOn:'2030-06-03'}),'2030-06-03');
 assert.equal(checkInDate('2026-02-30'),null);
 assert.equal(checkInDate('2026-2-3'),null);
 assert.ok(checkInDate('2028-02-29'));
});
test('real reminder action passes the reading id and date to native scheduling; web and bad dates never schedule',async()=>{
 const scheduled:unknown[][]=[];
 const ports:NativePorts={platform:'ios',notifications:{permission:async()=>true,schedule:async(...args)=>{scheduled.push(args)}},apple:{available:async()=>false,enabled:false,owner:async()=>null,signIn:async()=>null,link:async()=>undefined},share:async()=>{},link:()=>''};
 const on=localDay(new Date(Date.now()+86400000*5));
 const before=Date.now();
 assert.match(await nativeActions(ports).reminder(reading.headline,reading.id,on),/reminder set/);
 assert.equal(scheduled[0][0],'Did it come true?');assert.equal(scheduled[0][3],reading.id);
 assert.ok(Math.abs(Number(scheduled[0][2])-((checkInDate(on)!.getTime()-before)/1000))<2);
 await nativeActions(ports).reminder('',reading.id,'2026-02-30');assert.equal(scheduled.length,1);
 ports.platform='web';assert.match(await nativeActions(ports).reminder('',reading.id,on),/Native reminder preview/);assert.equal(scheduled.length,1);
});
