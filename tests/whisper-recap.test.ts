import test from 'node:test';
import assert from 'node:assert/strict';
import {answerWhisper,keepWhisper,lastWhisper} from '../src/whisper';
import {weekRecap} from '../src/recap';
import type {Prediction} from '../src/types';

test('a whisper is kept once per day and only yesterday’s is asked about',()=>{
 let whispers=keepWhisper(undefined,'2026-10-04','By tonight, a plan may change.');
 assert.equal(keepWhisper(whispers,'2026-10-04','A second text for the same day.'),whispers,'the first whisper shown is the one checked');
 assert.equal(keepWhisper(whispers,'2026-02-30','Bad day.'),whispers);
 assert.equal(lastWhisper(whispers,'2026-10-04'),undefined,'today’s whisper is not checked until tomorrow');
 assert.equal(lastWhisper(whispers,'2026-10-05')?.day,'2026-10-04');
 assert.equal(lastWhisper(whispers,'2026-10-06'),undefined,'a skipped morning does not create a catch-up check');
 assert.equal(lastWhisper(whispers,'2026-10-12'),undefined);
 whispers=keepWhisper(whispers,'2026-10-05','By tonight, a message may arrive.');
 assert.equal(lastWhisper(whispers,'2026-10-06')?.day,'2026-10-05','only the latest whisper is asked about');
 whispers=answerWhisper(whispers,'2026-10-05','yes','2026-10-06');
 assert.deepEqual(whispers[0],{day:'2026-10-05',text:'By tonight, a message may arrive.',outcome:'yes',checkedInAt:'2026-10-06'});
 for(let day=1;day<=70;day++)whispers=keepWhisper(whispers,`2027-0${1+Math.floor((day-1)/28)}-${String((day-1)%28+1).padStart(2,'0')}`,'By tonight, something small.');
 assert.equal(whispers.length,60,'the log is bounded');
});

const reading=(createdAt:string,question:string,extra:Partial<Prediction>={}):Prediction=>({id:createdAt+question,createdAt,question,headline:'h',label:'Speculative',why:'',facts:{},sources:[],assumptions:[],friend:false,...extra});
test('the weekly recap counts the last seven local days only and suggests a new area',()=>{
 const history=[
  reading('2026-10-11T09:00:00','Will I get the job promotion?',{golden:true}),
  reading('2026-10-06T09:00:00','Will my job interview go well?',{outcome:'no',checkedInAt:'2026-10-07'}),
  reading('2026-10-04T09:00:00','Will I learn Spanish?',{outcome:'yes',checkedInAt:'2026-10-10'}),
  reading('2026-10-08T09:00:00','Will our circle win?',{circleId:'c1'}),
 ];
 const whispers=[{day:'2026-10-10',text:'w',outcome:'yes' as const,checkedInAt:'2026-10-11'},{day:'2026-10-09',text:'w',outcome:'no' as const,checkedInAt:'2026-10-10'},{day:'2026-10-08',text:'w'},{day:'2026-10-01',text:'w',outcome:'yes' as const,checkedInAt:'2026-10-02'}];
 const recap=weekRecap(history,whispers,'2026-10-11');
 assert.deepEqual(recap,{from:'2026-10-05',to:'2026-10-11',readings:2,golden:1,landed:1,theme:'work',suggestion:'What personal goal will I grow into this year?'});
 assert.equal(weekRecap([],[],'2026-10-11').suggestion,'What personal goal will I grow into this year?');
 const busy=['Will I grow?','Will I learn piano?','Will my job change?','Will I move to Paris?'].map((q,i)=>reading(`2026-10-0${6+i}T09:00:00`,q));
 assert.equal(weekRecap(busy,[],'2026-10-11',true).suggestion,'What personal goal will I grow into this year?','teens are never pointed at love or money');
 assert.equal(weekRecap(busy,[],'2026-10-11').suggestion,'Will I find a deeper connection this year?');
});

import {forgetOmen,invalidateOmen,loadDailyOmen,omenKey} from '../src/daily-omen';
test('a whisper finished while Home was away survives the next day’s omen load for its morning check',async()=>{
 invalidateOmen();const values=new Map<string,string>();
 const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value)}};
 const whisper='By tonight, a small plan may change for the better.';
 // Day one finishes generating with nobody saving its whisper into the account.
 await loadDailyOmen(storage,{},async()=>({text:'A small door opens today.',whisper}),()=>new Date(2026,9,4,9));
 const morning=new Date(2026,9,5,8),fail=async()=>{throw new Error('offline')};
 const next=await loadDailyOmen(storage,{},async()=>({text:'Another small door.',whisper:'By tonight, a message may arrive.'}),()=>morning);
 assert.deepEqual(next.previous,{day:'2026-10-04',whisper},'the rollover hands yesterday’s whisper to Home');
 invalidateOmen();
 assert.deepEqual((await loadDailyOmen(storage,{},fail,()=>morning)).previous,{day:'2026-10-04',whisper},'a later Home visit that day still sees it');
 invalidateOmen();const failedDay=new Map([[omenKey,JSON.stringify({day:'2026-10-05',text:null,tries:1,previous:{day:'2026-10-04',whisper}})]]);
 const retrying={getItem:async(key:string)=>failedDay.get(key)??null,setItem:async(key:string,value:string)=>{failedDay.set(key,value)}};
 assert.deepEqual((await loadDailyOmen(retrying,{},fail,()=>morning)).previous,{day:'2026-10-04',whisper},'the bounded retry keeps it');
 await forgetOmen(storage);invalidateOmen();
 assert.equal((await loadDailyOmen(storage,{},fail,()=>new Date(2026,9,6,8))).previous,undefined,'Forget everything erases it');
});

import {watchLocalDay} from '../src/retention';
import {skyOn} from '../src/real-sky.ts';
test('the recap’s local day advances at local midnight and on return to the app',t=>{
 t.mock.timers.enable({apis:['Date','setInterval'],now:new Date(2026,9,3,23,59,30)});
 const days:string[]=[];let foreground!:(state:string)=>void,removed=false;
 const stop=watchLocalDay(day=>days.push(day),{addEventListener:(_type,listener)=>{foreground=listener;return {remove:()=>{removed=true}}}});
 t.mock.timers.tick(60000);
 assert.deepEqual(days,['2026-10-04'],'the minute check enters Sunday at local midnight');
 t.mock.timers.tick(24*60*60000);
 assert.deepEqual(days,['2026-10-04','2026-10-05'],'the minute check leaves Sunday at local midnight');
 t.mock.timers.setTime(new Date(2026,9,6,7).getTime());foreground('background');assert.equal(days.length,2);
 foreground('active');assert.deepEqual(days,['2026-10-04','2026-10-05','2026-10-06'],'returning to the app picks up the new day at once');
 foreground('active');t.mock.timers.tick(60000);assert.equal(days.length,3,'an unchanged day is not reported again');
 stop();assert.ok(removed);
});

test('an extra sentence in the whisper or omen is repaired once, then fails closed, and the app never saves it',async()=>{
 const {personalOmen}=await import('../server/omen');const {provider}=await import('../server/provider');const {requestOmen}=await import('../src/api');
 const original=globalThis.fetch,good={text:'A small door opens today.',whisper:'By tonight, a small plan may change for the better.'};
 const reply=(value:object)=>new Response(JSON.stringify({message:{content:JSON.stringify(value)}}));
 try{
  for(const extra of [{...good,whisper:'By tonight, a small plan may change. Keep an open mind.'},{...good,text:'A small door opens today. Walk through it.'}]){
   let calls=0;globalThis.fetch=async()=>reply(calls++===0?extra:good);
   assert.deepEqual(await personalOmen({},provider(()=>undefined,160),skyOn('2026-10-14')),good,'the repair returns one sentence');assert.equal(calls,2);
   calls=0;globalThis.fetch=async()=>{calls++;return reply(extra)};
   await assert.rejects(personalOmen({},provider(()=>undefined,160),skyOn('2026-10-14')));assert.equal(calls,2,'an unrepaired extra sentence fails closed');
  }
  globalThis.fetch=async()=>Response.json({kind:'ok',value:{text:good.text,whisper:'By tonight, a small plan may change. Keep an open mind.'}});
  await assert.rejects(requestOmen({},{sunSign:null,ageConfirmed:true}),/Insight unavailable/,'the client boundary refuses it too');
  globalThis.fetch=async()=>Response.json({kind:'ok',value:good});
  assert.deepEqual(await requestOmen({},{sunSign:null,ageConfirmed:true}),good);
 }finally{globalThis.fetch=original;}
});
