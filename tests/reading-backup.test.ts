import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as readings from '../src/reading-history';
import * as profile from '../src/profile';
import * as retention from '../src/retention';

const stamp=(n:number)=>`2026-10-04T00:00:00.${String(n).padStart(6,'0')}Z`;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function hooks(effectsEnabled=true){
 const slots:any[]=[],effects:(()=>void)[]=[];let cursor=0;
 const react={
  createContext:()=>({Provider:'Provider'}),createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:(effect:()=>void,deps:any[])=>{const i=cursor++;if(effectsEnabled&&(!slots[i]||deps.some((d,j)=>d!==slots[i][j]))){slots[i]=deps;effects.push(effect)}},
 };
 return {react,render:(component:()=>any)=>{cursor=0;const result=component();effects.splice(0).forEach(effect=>effect());return result}};
}
function load(path:string,imports:Record<string,any>,warnings:string[]){
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??(name==='expo-crypto'?{randomUUID:()=>crypto.randomUUID()}:{}),AbortController,setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},console:{warn:(message:string)=>warnings.push(message)}});
 return module.exports;
}
async function fixture(earlierUpload=false,api:Record<string,unknown>={}){
 const day=new Date().toISOString().slice(0,10),warnings:string[]=[],uploads:string[][]=[];
 let disk=JSON.stringify({onboardingDone:true,ageConfirmed:true,ageBand:'adult',backupOwner:'owner',sunSign:null,facts:{},history:[],credits:2,plus:false,usage:{day,count:1},reduceMotion:true,largeText:false});
 const card={id:'receipt',asker_id:'owner',circle_id:'circle',charged_at:null,question:'Will we learn?',headline:'A shared skill awaits.',due_date:'2099-01-01',created_at:new Date().toISOString()};
 let fail!:(error:Error)=>void,blocking=true;
 const remote=new Promise<void>((_resolve,reject)=>{fail=reject});
 const h=hooks();
 const storeModule=load('../src/store.tsx',{
  react:h.react,'react-native':{},'./reading-history':readings,'./profile':profile,
  './cloud':{anonymousOwner:async()=>'owner',mirror:async(state:any)=>{uploads.push(Array.from(state.history,(p:any)=>p.id));if((earlierUpload||state.history.length)&&blocking)await remote},restoreBackup:async(state:any)=>({...state,history:[],facts:{}})},
  './api':api,
  './social':{publishCircleForecast:async()=>card},
  '@react-native-async-storage/async-storage':{getItem:async()=>disk,setItem:async(_key:string,value:string)=>{disk=value}},
  './daily-omen':{forgetOmen:async()=>{}},'./native':{forgetCheckIns:async()=>{},reopenCheckIn:()=>{}},'./omen-widget':{updateOmenWidget:()=>{}},
 },warnings);
 const render=()=>h.render(()=>storeModule.Store({})).props.value;
 render();await tick();render();await tick();
 return {render,card,warnings,uploads,state:()=>JSON.parse(disk),fail:()=>{blocking=false;fail(new Error('backup offline'))}};
}

for(const friend of [false,true])test(`${friend?'friend':'personal'} retry keeps its ask key and survives backup failure`,async()=>{
 const f=await fixture(),h=hooks(false),params:any={};
 const reading={...readings.circleReading(f.card),circleId:undefined,friend};
 const keys:string[]=[];
 const attempt=(key:string)=>{keys.push(key);if(keys.length===1)throw new Error('response lost');return reading};
 const app=load('../app/index.tsx',{
  react:h.react,'react-native':{Platform:{OS:'web'},useWindowDimensions:()=>({height:844})},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>params,router:{setParams:(next:any)=>Object.assign(params,next)}},
  '../src/store':{useStore:f.render,learnedFacts:()=>({})},'../src/profile':profile,'../src/retention':retention,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/useDelight':{useDelight:()=>{}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value,activityTheme:()=> 'learning'},
  '../src/SocialScreen':{Social:'Social'},'../src/native':{haptic:()=>{},reminder:async()=>{}},
  '../src/social':{friendForecast:async(_q:string,_target:any,_signal:any,_consent:string,key:string)=>attempt(key),checkInCircles:async()=>{}},'../src/delight':{assignEdition:(p:any)=>p},
  '../src/questions':{validateAnswer:()=>{},factLabels:{}},
  '../src/api':{request:async(action:string,_q:string,_facts:any,_friend:boolean,_signal:any,_context:any,_consent:string,key:string)=>({kind:'ok',value:action==='predict'?attempt(key):{topic:'learning',provided:{},cards:[{id:'goal',question:'Your goal?',options:['Learn'],remember:false}]}})},
 },f.warnings);
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>nodes(h.render(app.default));
 render().find(n=>n.props.testID==='tab-sky').props.onPress();
 render().find(n=>n.type==='Social').props.onAsk('Will we learn?',friend,friend?{id:'friend'}:undefined);
 void render().find(n=>n.props.testID==='look-into-the-future').props.onPress();await tick();
 if(!friend){render().find(n=>n.props.testID==='option-0').props.onPress();await tick()}
 render().find(n=>n.props.label==='Try again').props.onPress();await tick();
 assert.equal(keys.length,2);assert.equal(keys[0],keys[1]);assert.match(keys[0],/^[0-9a-f-]{36}$/);
 const revealed=render();await tick();
 assert.ok(revealed.some(n=>n.props.testID==='forecast-due-date'));
 assert.equal(f.state().credits,1);assert.equal(f.state().history.length,1);
 assert.ok(f.uploads.some(ids=>ids.includes('receipt')));
 f.fail();await tick();
 assert.ok(render().some(n=>n.props.testID==='forecast-due-date'));
 assert.ok(!render().some(n=>n.children.some((c:any)=>typeof c==='string'&&c.includes('Nothing was charged'))));
 assert.equal(f.warnings.length,1);
 await f.render().savePrediction(reading);f.render();await tick();
 assert.equal(f.state().credits,1);assert.equal(f.state().history.length,1);
});

// The server charges Circle publication; the device keeps its own copy without spending a local credit.
for(const replacement of ['forget','restore'])test(`Circle publish completes before backup and orders ${replacement}`,async()=>{
 const f=await fixture();let completed=false;
 const work=f.render().publishCircle('draft').then(()=>{completed=true});
 await tick();assert.equal(completed,true);await work;
 assert.equal(f.state().credits,2);assert.deepEqual(f.state().history.map((p:any)=>p.id),['receipt']);f.render();await tick();
 {
  let replaced=false;
  const store=f.render();
  const replacing=(replacement==='forget'?store.forgetAll():store.backup('restore',async()=>{})).then(()=>{replaced=true});
  await tick();assert.equal(replaced,false);
  f.fail();await replacing;assert.equal(replaced,true);
 }
 f.render();await tick();
 assert.equal(f.state().credits,2);assert.deepEqual(f.state().history,[]);
});


for(const mode of ['private','publish'])for(const replacement of ['forget','restore'])test(`${mode} completes during an earlier upload and preserves ${replacement} ordering`,async()=>{
 const f=await fixture(true);
 assert.deepEqual(f.uploads,[[]]);
 const reading={...readings.circleReading(f.card),circleId:undefined};
 const complete=()=>mode==='private'?f.render().savePrediction(reading):f.render().publishCircle('draft'),credits=mode==='private'?1:2;
 let completed=false;
 const work=complete().then(()=>{completed=true});
 await tick();assert.equal(completed,true);await work;
 assert.equal(f.render().backupBusy,false);
 assert.equal(f.state().credits,credits);
 assert.deepEqual(f.state().history.map((p:any)=>p.id),['receipt']);
 let retried=false;
 const retry=complete().then(()=>{retried=true});
 await tick();assert.equal(retried,true);await retry;
 assert.equal(f.state().credits,credits);
 assert.deepEqual(f.uploads,[[]]);
 let replaced=false;
 const store=f.render();
 const replacing=(replacement==='forget'?store.forgetAll():store.backup('restore',async()=>{})).then(()=>{replaced=true});
 await tick();assert.equal(replaced,false);
 f.fail();await replacing;f.render();await tick();
 assert.equal(replaced,true);assert.equal(f.state().credits,credits);
 assert.deepEqual(f.state().history,[]);
 assert.ok(f.uploads.every(ids=>ids.length===0));
 assert.equal(f.warnings.length,1);
});

for(const mode of ['save','restore'] as const)for(const restoreFails of [false,true])test(`${mode} refreshes account balance and rejects stale responses (failure=${restoreFails})`,async()=>{
 const h=hooks(),warnings:string[]=[],day=new Date().toISOString().slice(0,10);
 const oldBalance={owner:'anonymous',asOf:stamp(10),plus:false,plusUntil:null,packs:0,used:1,day};
 const paidBalance={owner:'paid',asOf:stamp(1),plus:true,plusUntil:'2099-01-01',packs:5,used:0,day};
 let disk=JSON.stringify({sunSign:null,ageBand:'adult',ageConfirmed:true,facts:{},history:[],credits:0,plus:false,usage:{day,count:1},reduceMotion:false,largeText:false});
 let owner='anonymous',finishHydration!:(b:typeof oldBalance)=>void;
 const pending=new Promise<typeof oldBalance>(resolve=>{finishHydration=resolve});
 const store=load('../src/store.tsx',{
  react:h.react,'react-native':{},'./reading-history':readings,'./profile':profile,
  './api':{serverMetered:true,loadBalance:()=>owner==='anonymous'?pending:Promise.resolve(paidBalance)},
  './cloud':{anonymousOwner:async()=>owner,mirror:async()=>{if(restoreFails)throw new Error('backup offline')},restoreBackup:async(s:any)=>{if(restoreFails)throw new Error('backup offline');return {...s,backupOwner:owner}},supabase:{auth:{getSession:async()=>({data:{session:{user:{id:owner,is_anonymous:false}}}})}}},
  '@react-native-async-storage/async-storage':{getItem:async()=>disk,setItem:async(_key:string,value:string)=>{disk=value}},
  './native':{reopenCheckIn:()=>{}},
 },warnings);
 const render=()=>h.render(()=>store.Store({})).props.value;
 render();await tick();assert.equal(render().ready,false);
 finishHydration(oldBalance);await tick();const earlier=render();await tick();
 assert.equal(earlier.remaining,0);
 const backup=earlier.backup(mode,async()=>{owner='paid'});
 if(restoreFails)await assert.rejects(backup,/backup offline/);else await backup;
 let current=render();assert.equal(current.state.plus,true);assert.equal(current.remaining,15);
 await earlier.applyBalance(oldBalance);
 await assert.rejects(earlier.savePrediction({id:'old-reading'},{},oldBalance),/account changed/);
 current=render();assert.equal(current.state.plus,true);assert.equal(current.remaining,15);
 await current.applyBalance({...paidBalance,asOf:stamp(2),used:2});
 current=render();assert.equal(current.remaining,13);
 await tick();assert.equal(JSON.parse(disk).plus,true);
});

for(const purchaseMode of ['store','mock'])test(`Plus labels match ${purchaseMode} purchases on Home and You`,async()=>{
 const f=await fixture(),h=hooks(false);
 f.render().update((s:any)=>({...s,plus:true}));
 const app=load('../app/index.tsx',{
  react:h.react,'react-native':{Platform:{OS:'web'},useWindowDimensions:()=>({height:844})},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>({}),router:{setParams:()=>{}}},
  '../src/store':{useStore:f.render},'../src/profile':profile,'../src/retention':retention,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/useDelight':{useDelight:()=>{}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value},
  '../src/purchases':{purchaseMode},'../src/questions':{factLabels:{}},
 },f.warnings);
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>nodes(h.render(app.default));
 const label=purchaseMode==='mock'?'Plus · test':'Plus';
 assert.equal(render().filter(n=>n.children.includes(label)).length,1);
 render().find(n=>n.props.testID==='tab-you').props.onPress();
 assert.equal(render().filter(n=>n.children.includes(label)).length,2);
});

for(const fails of [false,true])test(`initial balance settles before purchases are admitted (failure=${fails})`,async()=>{
 const h=hooks(),warnings:string[]=[],day=new Date().toISOString().slice(0,10);
 const exhausted={owner:'owner',asOf:stamp(1),plus:false,plusUntil:null,packs:0,used:1,day};
 let disk=JSON.stringify({sunSign:null,ageBand:'adult',ageConfirmed:true,facts:{},history:[],credits:0,plus:false,usage:{day,count:1},reduceMotion:false,largeText:false});
 let finish!:(b:typeof exhausted)=>void,fail!:(error:Error)=>void;
 const pending=new Promise<typeof exhausted>((resolve,reject)=>{finish=resolve;fail=reject});
 const store=load('../src/store.tsx',{
  react:h.react,'react-native':{},'./reading-history':readings,'./profile':profile,
  './api':{serverMetered:true,loadBalance:()=>pending},
  './cloud':{anonymousOwner:async()=>'owner'},
  '@react-native-async-storage/async-storage':{getItem:async()=>disk,setItem:async(_key:string,value:string)=>{disk=value}},
  './native':{reopenCheckIn:()=>{}},
 },warnings);
 const render=()=>h.render(()=>store.Store({})).props.value;
 render();await tick();
 const opening=render();assert.equal(opening.ready,false);assert.equal(opening.backupBusy,true);
 await assert.rejects(opening.savePrediction({id:'premature'}),/wait for your archive/);
 await assert.rejects(opening.publishCircle('premature'),/wait for your archive/);
 await assert.rejects(opening.backup('restore',async()=>{}),/wait for your archive/);
 await assert.rejects(opening.applyBalance({...exhausted,packs:5}),/wait for your archive/);assert.equal(render().state.credits,0);
 if(fails)fail(new Error('offline'));else finish(exhausted);
 await tick();const ready=render();assert.equal(ready.ready,true);assert.equal(ready.remaining,0);
 await ready.applyBalance({...exhausted,asOf:stamp(2),packs:5});
 render();await tick();assert.equal(render().remaining,5);assert.equal(JSON.parse(disk).credits,5);
 assert.equal(warnings.length,fails?1:0);
});

test('purchase balance waits for unrelated archive work instead of being discarded',async()=>{
 const f=await fixture(true),store=f.render();
 const forgetting=store.forgetAll();await tick();
 let applied=false;
 const applying=store.applyBalance({owner:'owner',asOf:stamp(1),plus:false,plusUntil:null,packs:5,used:1,day:new Date().toISOString().slice(0,10)}).then(()=>{applied=true});
 await tick();assert.equal(applied,false);
 f.fail();await forgetting;await applying;
 assert.equal(f.render().remaining,5);assert.equal(f.state().credits,5);
});

for(const older of ['purchase','reading'])test(`newer balance survives a delayed ${older} response`,async()=>{
 const f=await fixture(),store=f.render(),day=new Date().toISOString().slice(0,10);
 const oldBalance={owner:'owner',asOf:stamp(1),plus:false,plusUntil:null,packs:5,used:1,day};
 const newBalance={...oldBalance,asOf:stamp(2),packs:4};
 const reading={...readings.circleReading(f.card),circleId:undefined};
 if(older==='purchase'){
  await store.savePrediction(reading,{},newBalance);
  await store.applyBalance(oldBalance);
 }else{
  await store.applyBalance(newBalance);
  await store.savePrediction(reading,{},oldBalance);
 }
 assert.equal(f.state().credits,4);assert.equal(f.state().usage.count,1);
 assert.equal(f.state().history.length,1);
 f.render();await tick();f.fail();await tick();
});

test('queued snapshots retain the newest database timestamp',async()=>{
 const f=await fixture(true),store=f.render();
 const forgetting=store.forgetAll();await tick();
 const balance={owner:'owner',asOf:stamp(2),plus:false,plusUntil:null,packs:5,used:1,day:new Date().toISOString().slice(0,10)};
 const older=store.applyBalance(balance);
 const newer=store.applyBalance({...balance,asOf:stamp(3),packs:4});
 f.fail();await forgetting;await older;await newer;
 assert.equal(f.state().credits,4);assert.equal(f.render().remaining,4);
});

test('Circle publication supersedes an older purchase balance',async()=>{
 const balance={owner:'owner',asOf:stamp(2),plus:false,plusUntil:null,packs:4,used:1,day:new Date().toISOString().slice(0,10)};
 const f=await fixture(false,{serverMetered:true,loadBalance:async()=>balance}),store=f.render();
 await store.publishCircle('draft');
 await store.applyBalance({...balance,asOf:stamp(1),packs:5});
 assert.equal(f.state().credits,4);assert.equal(f.state().history.length,1);
 f.render();await tick();f.fail();await tick();
});

test('database snapshot time wins over request order and ignores other owners',async()=>{
 const f=await fixture(),store=f.render();
 const snapshot={owner:'owner',asOf:stamp(2),plus:false,plusUntil:null,packs:0,used:1,day:new Date().toISOString().slice(0,10)};
 await store.applyBalance(snapshot);
 await store.applyBalance({...snapshot,asOf:stamp(1),packs:9});
 assert.equal(f.state().credits,0);
 await store.applyBalance({...snapshot,asOf:stamp(3),packs:5});
 assert.equal(f.state().credits,5);
 await store.applyBalance({...snapshot,asOf:stamp(3),packs:9});
 await store.applyBalance({...snapshot,owner:'other-owner',asOf:stamp(99),packs:20});
 assert.equal(f.state().credits,5);
 assert.equal(f.state().balanceSnapshot.asOf,stamp(3));
});
