import test from 'node:test';
import assert from 'node:assert/strict';
import {forgetOmen,invalidateOmen,loadDailyOmen,omenKey,type Omen} from '../src/daily-omen.ts';
import {localDay} from '../src/retention.ts';

test('omen completion publishes after its Home consumer detaches, unless reset invalidates it',async()=>{
 for(const reset of [false,true]){
  invalidateOmen();
  const values=new Map<string,string>(),published:(Omen|null)[]=[];
  const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value);}};
  let finish!:(text:string)=>void,started!:()=>void;
  const generating=new Promise<void>(resolve=>{started=resolve;});
  let mounted=true,screen:Omen|null=null;
  const load=loadDailyOmen(storage,{},()=>{started();return new Promise(resolve=>{finish=resolve;});},()=>new Date(),omen=>{published.push(omen);});
  const consumer=load.then(omen=>{if(mounted)screen=omen;});
  await generating;
  mounted=false;
  if(reset)await forgetOmen(storage);
  finish('Your private constellation shines today.');
  await consumer;
  assert.equal(screen,null);
  assert.deepEqual(published,reset?[]:[{day:localDay(),text:'Your private constellation shines today.'}]);
  assert.equal(JSON.parse(values.get(omenKey)!).text,reset?null:'Your private constellation shines today.');
 }
});

test('cached and failed omens publish, but a cache read crossing reset does not',async()=>{
 invalidateOmen();
 let value=JSON.stringify({day:localDay(),text:'Cached personal omen.'});
 const published:(Omen|null)[]=[];
 const publish=(omen:Omen|null)=>{published.push(omen);};
 const storage={getItem:async()=>value,setItem:async(_key:string,next:string)=>{value=next;}};
 const unused=async()=>{assert.fail('A cached day must not generate again');};
 await loadDailyOmen(storage,{},unused,()=>new Date(),publish);
 assert.equal(published[0]!.text,'Cached personal omen.');
 let release!:()=>void,started!:()=>void;
 const reading=new Promise<void>(resolve=>{started=resolve;});
 const gate=new Promise<void>(resolve=>{release=resolve;});
 const paused={...storage,getItem:async()=>{const snapshot=value;started();await gate;return snapshot;}};
 const pending=loadDailyOmen(paused,{},unused,()=>new Date(),publish);
 await reading;
 const forgetting=forgetOmen(storage);
 release();await Promise.all([pending,forgetting]);
 assert.equal(published.length,1);
 await loadDailyOmen(storage,{},unused,()=>new Date(),publish);
 assert.equal(published[1]!.text,null);
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
 await loadDailyOmen(storage,{},async()=>{throw new Error('offline');},()=>tomorrow,publish);
 assert.deepEqual(published[2],{day:localDay(tomorrow),text:null});
});

test('midnight completion hides expired text without spending the new day quota',async()=>{
 for(const phase of ['generation','cache'] as const){
  for(const reset of [false,true]){
   invalidateOmen();
   let now=new Date(2026,8,30,23,59,50),calls=0;
   const oldDay=localDay(now),published:(Omen|null)[]=[];
   const values=new Map<string,string>();
   if(phase==='cache')values.set(omenKey,JSON.stringify({day:oldDay,text:'Yesterday’s private omen.'}));
   let release!:()=>void,started!:()=>void;
   const gate=new Promise<void>(resolve=>{release=resolve;});
   const waiting=new Promise<void>(resolve=>{started=resolve;});
   let pause=true;
   const storage={
    getItem:async(key:string)=>{const raw=values.get(key)??null;if(pause&&phase==='cache'){started();await gate;}return raw;},
    setItem:async(key:string,value:string)=>{values.set(key,value);},
   };
   const generate=async()=>{calls++;if(pause&&phase==='generation'){started();await gate;}return 'Yesterday’s private omen.';};
   const publish=(omen:Omen|null)=>{published.push(omen);};
   const loading=loadDailyOmen(storage,{},generate,()=>now,publish);
   await waiting;
   now=new Date(2026,9,1,0,0,10);
   const joined=loadDailyOmen(storage,{},generate,()=>now,publish);
   const forgetting=reset?forgetOmen(storage):Promise.resolve();
   pause=false;release();
   const [home,otherHome]=await Promise.all([loading,joined]);
   await forgetting;
   assert.deepEqual(home,{day:localDay(now),text:null});
   assert.deepEqual(otherHome,home);
   assert.deepEqual(published,reset?[]:[null]);
   assert.equal(JSON.parse(values.get(omenKey)!).day,oldDay);
   assert.equal(calls,phase==='generation'?1:0);
   const today=await loadDailyOmen(storage,{},async()=>{calls++;return 'Today’s omen.';},()=>now,publish);
   assert.deepEqual(today,{day:localDay(now),text:'Today’s omen.'});
   await loadDailyOmen(storage,{},generate,()=>now,publish);
   assert.equal(calls,phase==='generation'?2:1);
  }
 }
});
