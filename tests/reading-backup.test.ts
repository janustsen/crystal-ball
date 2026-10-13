import test from 'node:test';
import assert from 'node:assert/strict';
import * as ballAsks from '../src/ball-asks';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {askBallMock,homeMock} from './home-mock';
import * as readings from '../src/reading-history';
import * as profile from '../src/profile';
import * as retention from '../src/retention';
import * as whisper from '../src/whisper';
import * as ritual from '../src/ritual';
import * as billing from '../src/billing';
import * as storyCard from '../src/story-card';
import * as webReading from '../src/web-reading';
import {motion} from '../src/motion';
const {plans,packs}=billing;

const stamp=(n:number)=>`2026-10-04T00:00:00.${String(n).padStart(6,'0')}Z`;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function hooks(effectsEnabled=true){
 const slots:any[]=[],effects:(()=>void)[]=[];let cursor=0;
 const react={
  createContext:()=>({Provider:'Provider'}),createElement:(type:any,props:any,...children:any[]):any=>typeof type==='function'?type({...props,children}):({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  // A memoized callback holds one hook slot and keeps its first identity, as its empty dependency list does in React.
  useCallback:(callback:any)=>{const i=cursor++;return slots[i]??(slots[i]=callback)},
  useEffect:(effect:()=>void|(()=>void),deps:any[])=>{const i=cursor++;if(effectsEnabled&&(!slots[i]||deps.some((d,j)=>d!==slots[i].deps[j]))){const previous=slots[i];slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=effect()})}},
 };
 return {react,unmount:()=>slots.forEach(slot=>slot?.cleanup?.()),render:(component:()=>any)=>{cursor=0;const result=component();effects.splice(0).forEach(effect=>effect());return result}};
}
function load(path:string,imports:Record<string,any>,warnings:string[],globals:Record<string,unknown>={}){
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText;
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??(name==='../src/story-card'?storyCard:name==='../src/uuid'?{uuid:()=>crypto.randomUUID()}:name==='../src/web-reading'?webReading:name==='../src/ball-asks'?ballAsks:name==='../src/BallAsks'?{BallAsks:'BallAsks'}:{}),AbortController,performance,setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},console:{warn:(message:string)=>warnings.push(message)},...globals});
 return module.exports;
}
async function fixture(earlierUpload=false,api:Record<string,unknown>={},globals:Record<string,unknown>={},account:Record<string,unknown>={}){
 const day=new Date().toISOString().slice(0,10),warnings:string[]=[],uploads:string[][]=[];
 let disk=JSON.stringify({onboardingDone:true,ageConfirmed:true,ageBand:'adult',backupOwner:'owner',sunSign:null,facts:{},history:[],credits:2,plus:false,usage:{day,count:1},reduceMotion:true,largeText:false,...account});
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
 },warnings,globals);
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
  '../src/store':{useStore:f.render,learnedFacts:()=>({})},'../src/profile':profile,'../src/retention':retention,'../src/ritual':ritual,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(h.react),'../src/AskBall':askBallMock(h.react),'../src/useDelight':{useDelight:()=>{}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value,activityTheme:()=> 'learning'},
  '../src/SocialScreen':{Social:'Social'},'../src/native':{haptic:()=>{},reminder:async()=>{}},
  '../src/social':{friendForecast:async(_q:string,_target:any,_signal:any,_consent:string,key:string)=>attempt(key),checkInCircles:async()=>{}},'../src/delight':{assignEdition:(p:any)=>p,narration:()=>null},
  '../src/questions':{validateAnswer:()=>{},factLabels:{}},
  '../src/api':{webReadingVisitor:()=>false,request:async(action:string,_q:string,_facts:any,_friend:boolean,_signal:any,_context:any,_consent:string,key:string)=>({kind:'ok',value:action==='predict'?attempt(key):{topic:'learning',provided:{},cards:[{id:'goal',question:'Your goal?',options:['Learn'],remember:false}]}})},
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
 const month=day.slice(0,7);
 earlier.update((s:any)=>({...s,chartWeather:{month,text:'Anonymous weather'}}));
 assert.equal(render().state.chartWeather.text,'Anonymous weather');
 let finishWeather!:(text:string)=>void;
 const weather=new Promise<string>(resolve=>{finishWeather=resolve}).then(text=>earlier.update((s:any)=>({...s,chartWeather:{month,text}})));
 const backup=earlier.backup(mode,async()=>{
  assert.equal(render().state.chartWeather,undefined);
  owner='paid';
 });
 if(restoreFails)await assert.rejects(backup,/backup offline/);else await backup;
 let current=render();assert.equal(current.state.plus,true);assert.equal(current.remaining,15);
 assert.equal(current.state.chartWeather,undefined);
 finishWeather('Late anonymous weather');await weather;
 assert.equal(render().state.chartWeather,undefined);
 current.update((s:any)=>({...s,chartWeather:{month,text:'Paid weather'}}));
 assert.equal(render().state.chartWeather.text,'Paid weather');
 current.update((s:any)=>({...s,largeText:true}));
 assert.equal(render().state.largeText,true);
 await earlier.applyBalance(oldBalance);
 await assert.rejects(earlier.savePrediction({id:'old-reading'},{},oldBalance),/account changed/);
 current=render();assert.equal(current.state.plus,true);assert.equal(current.remaining,15);
 await current.applyBalance({...paidBalance,asOf:stamp(2),used:2});
 current=render();assert.equal(current.remaining,13);
 await tick();assert.equal(JSON.parse(disk).plus,true);
 assert.equal(JSON.parse(disk).chartWeather.text,'Paid weather');
});

for(const purchaseMode of ['store','mock'])test(`Plus labels match ${purchaseMode} purchases on Home and You`,async()=>{
 const f=await fixture(),h=hooks(false);
 f.render().update((s:any)=>({...s,plus:true}));
 const app=load('../app/index.tsx',{
  react:h.react,'react-native':{Platform:{OS:'web'},useWindowDimensions:()=>({height:844})},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>({}),router:{setParams:()=>{}}},
  '../src/store':{useStore:f.render},'../src/profile':profile,'../src/retention':retention,'../src/ritual':ritual,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(h.react),'../src/AskBall':askBallMock(h.react),'../src/useDelight':{useDelight:()=>{}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value},
  '../src/purchases':{purchaseMode},'../src/questions':{factLabels:{}},
  '../src/api':{webReadingVisitor:()=>false},
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

test('Plans refreshes trial eligibility after reopen, purchase, restore and owner changes',async t=>{
 const h=hooks(),pending:((offers:any[])=>void)[]=[];
 t.after(h.unmount);
 let state:any={onboardingDone:true,ageConfirmed:true,sunSign:null,facts:{},history:[],plus:false,reduceMotion:true,balanceSnapshot:{owner:'one'}};
 let busy=false,finishPurchase!:()=>void,finishRestore!:()=>void;
 const app=load('../app/index.tsx',{
  react:h.react,'react-native':{Platform:{OS:'ios'},AppState:{addEventListener:()=>({remove(){}})},useWindowDimensions:()=>({height:844}),AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:()=>({remove(){}})},BackHandler:{addEventListener:()=>({remove(){}})}},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>({}),router:{setParams(){}}},
  '../src/store':{useStore:()=>({state,ready:true,backupBusy:busy,remaining:1,applyBalance:async()=>{},update(){}})},'../src/notify':{scheduleRitual:async()=>{},watchRitualTaps:()=>()=>{}},
  '../src/profile':profile,'../src/retention':retention,'../src/ritual':ritual,'../src/billing':{plans,packs,plusUnlocks:billing.plusUnlocks},
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(h.react),'../src/AskBall':askBallMock(h.react),'../src/useDelight':{useDelight(){}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value},
  '../src/social':{syncSocialProfile:async()=>{}},'../src/native':{watchCheckIns:()=>()=>{}},'../src/SocialPush':{watchSocialPushes:()=>()=>{}},
  '../src/purchases':{purchaseMode:'store',storeAvailable:true,storeOffers:()=>new Promise(resolve=>pending.push(resolve)),buy:()=>new Promise(resolve=>{finishPurchase=()=>resolve('purchased')}),restore:()=>new Promise(resolve=>{finishRestore=()=>resolve({})})},
  '../src/api':{webReadingVisitor:()=>false,syncStoreBalance:async()=>({})},
 },[]);
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>nodes(h.render(app.default));
 const trial=()=>render().some(n=>n.children.some((c:any)=>typeof c==='string'&&c.startsWith('Weekly starts with a 3-day free trial')));
 const settle=async(eligible:boolean)=>{assert.ok(pending.length);pending.shift()!([{kind:'weekly',price:'$1.99',trial:eligible,pkg:{}}]);await tick()};
 render().find(n=>n.props.testID==='view-plans').props.onPress();render();await settle(true);assert.equal(trial(),true);
 render().find(n=>n.props.testID==='close-flow').props.onPress();render();
 render().find(n=>n.props.testID==='view-plans').props.onPress();render();assert.equal(trial(),false);await settle(true);assert.equal(trial(),true);
 render().find(n=>n.props.label==='Continue with Plus').props.onPress();render();assert.equal(trial(),false);
 finishPurchase();await tick();render();await settle(false);assert.equal(trial(),false);
 render().find(n=>n.props.testID==='close-flow').props.onPress();render();
 render().find(n=>n.props.testID==='view-plans').props.onPress();render();await settle(true);assert.equal(trial(),true);
 render().find(n=>n.props.onPress&&n.children.some((c:any)=>c?.children?.includes('Restore purchases'))).props.onPress();render();assert.equal(trial(),false);
 finishRestore();await tick();render();await settle(false);assert.equal(trial(),false);
 state={...state,balanceSnapshot:{owner:'two'}};render();assert.equal(trial(),false);
 const stale=pending.shift()!;
 busy=true;render();busy=false;state={...state,balanceSnapshot:{owner:'three'}};render();
 stale([{kind:'weekly',price:'$1.99',trial:true,pkg:{}}]);await tick();assert.equal(trial(),false);
 await settle(false);assert.equal(trial(),false);
});

test('a phone clock behind the server still refreshes an exhausted balance at server midnight',async()=>{
 const intervals:(()=>void)[]=[],day=new Date().toISOString().slice(0,10);
 // Fetched a millisecond before the server's midnight; the phone is still well inside the same day.
 const asOf=new Date(new Date().setUTCHours(24,0,0,0)-1).toISOString().replace('Z','000Z');
 let loads=0;
 const f=await fixture(false,{serverMetered:true,loadBalance:async()=>{loads++;return {owner:'owner',asOf,plus:false,plusUntil:null,packs:0,used:1,day}}},{setInterval:(fn:()=>void)=>intervals.push(fn)});
 assert.equal(f.render().remaining,0);assert.equal(loads,1);
 await new Promise(resolve=>setTimeout(resolve,5));
 intervals.forEach(fn=>fn());
 assert.equal(loads,2);
});

test('a phone clock corrected backward after a balance still refreshes at server midnight',async()=>{
 const intervals:(()=>void)[]=[],day=new Date().toISOString().slice(0,10);
 let skew=0,monotonic=1000,loads=0;
 class PhoneDate extends Date{static now(){return Date.now()+skew}}
 // Fetched a millisecond before the server's midnight, while the phone clock agreed with the server.
 const asOf=new Date(new Date().setUTCHours(24,0,0,0)-1).toISOString().replace('Z','000Z');
 const f=await fixture(false,{serverMetered:true,loadBalance:async()=>{loads++;return {owner:'owner',asOf,plus:false,plusUntil:null,packs:0,used:1,day}}},{setInterval:(fn:()=>void)=>intervals.push(fn),Date:PhoneDate,performance:{now:()=>monotonic}});
 assert.equal(f.render().remaining,0);assert.equal(loads,1);
 skew=-2*3600000;monotonic+=60000;
 intervals.forEach(fn=>fn());
 assert.equal(loads,2);
});

for(const mode of ['personal','person','friend'])test(`${mode} Ask defers uncertain retries to the server and handles exhausted readings`,async()=>{
 const h=hooks(false),params:any={};let remaining=1,predicts=0,next:'lost'|'empty'='lost';
 const state={onboardingDone:true,ageConfirmed:true,ageBand:'adult',sunSign:null,facts:{},history:[],plus:false,reduceMotion:true};
 const app=load('../app/index.tsx',{
  react:h.react,'react-native':{Platform:{OS:'web'},useWindowDimensions:()=>({height:844})},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>params,router:{setParams:(value:any)=>Object.assign(params,value)}},
  '../src/store':{useStore:()=>({state,ready:true,backupBusy:false,remaining,applyBalance:async()=>{}})},
  '../src/profile':profile,'../src/retention':retention,'../src/ritual':ritual,'../src/billing':billing,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(h.react),'../src/AskBall':askBallMock(h.react),'../src/useDelight':{useDelight:()=>{}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value,activityTheme:()=>'learning'},
  '../src/SocialScreen':{Social:'Social'},'../src/native':{haptic:()=>{}},'../src/social':{friendForecast:async()=>{predicts++;throw new Error(next==='empty'?billing.noReadings:'response lost')}},
  '../src/questions':{validateAnswer:()=>{},adaptPlan:(plan:any)=>plan,factLabels:{}},
  '../src/purchases':{purchaseMode:'store',storeAvailable:true,storeOffers:()=>new Promise(()=>{})},
  '../src/api':{webReadingVisitor:()=>false,request:async(action:string)=>{
   if(action==='plan')return {kind:'ok',value:{topic:'learning',provided:{},cards:[{id:'goal',question:'Your goal?',options:['Learn','Teach'],remember:false}]}};
   predicts++;if(next==='empty')return {kind:'error',message:billing.noReadings};throw new Error('response lost');
  }},
 },[],{Error});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>nodes(h.render(app.default));
 const press=async(match:(n:any)=>boolean)=>{render().find(match).props.onPress();await tick()};
 const plansOpen=()=>render().some(n=>n.children.some((c:any)=>c==='Choose your next chapter.'));
 const closePlans=()=>press(n=>n.props.testID==='close-flow');
 const ask=async()=>{render().find(n=>n.props.testID==='close-flow')?.props.onPress();render().find(n=>n.props.testID==='tab-sky').props.onPress();render().find(n=>n.type==='Social').props.onAsk(mode==='person'?'Will Sam learn?':'Will I learn?',mode==='friend',mode==='friend'?{circle:'circle',member:'member',firstName:'Sam'}:undefined,mode==='person'?'Sam':'');await press(n=>n.props.testID==='look-into-the-future')};
 await ask();
 if(mode!=='friend')await press(n=>n.props.testID==='option-0');
 assert.equal(predicts,1);
 // The interrupted forecast spent the last reading on the server.
 remaining=0;
 await ask();
 if(mode!=='friend'){
  await press(n=>n.props.testID==='option-1');
  assert.equal(predicts,1,'changed answers are a new, charged reading');assert.ok(plansOpen());
  await closePlans();
  await press(n=>n.props.testID==='option-0');
 }
 assert.equal(predicts,2,'the interrupted reading reaches the server again');assert.ok(!plansOpen());
 await press(n=>n.props.label==='Try again');
 assert.equal(predicts,3,'an offline retry cannot consume server retry eligibility');assert.ok(!plansOpen());
 next='empty';
 await press(n=>n.props.label==='Try again');
 assert.equal(predicts,4);assert.ok(plansOpen());
 await closePlans();remaining=1;
 await press(n=>n.props.label==='Try again');
 assert.equal(predicts,5);assert.ok(plansOpen());
 // The refreshed balance confirms zero: the rejected ask is no longer pending, so Plans opens without another request.
 await closePlans();remaining=0;
 await press(n=>n.props.label==='Try again');
 assert.equal(predicts,5,'a rejected ask does not reach the server again');assert.ok(plansOpen());
});

 test('free web archives preserve allowance and packs, including duplicate saves',async()=>{
 const f=await fixture(),before=f.state();
 const reading={...readings.circleReading(f.card),circleId:undefined};
 await f.render().savePrediction(reading,{},null);
 await f.render().savePrediction(reading,{},null);
 assert.equal(f.state().history.length,1);
 assert.deepEqual(f.state().usage,before.usage);
 assert.equal(f.state().credits,before.credits);
 f.render();await tick();
 f.fail();await tick();
});

test('web quota refusals including pending browser reservations preserve eligibility until success',async()=>{
 // An anonymous sealed-link visitor: no linked account, Plus or purchased readings.
 const f=await fixture(false,{},{},{backupOwner:undefined,credits:0}),h=hooks(false),params:any={};let spent=false,predicts=0;
 const reading={...readings.circleReading(f.card),circleId:undefined};
 const outcomes=[{kind:'error',message:webReading.webNetworkUsed},{kind:'error',message:webReading.webReadingsResting},{kind:'error',message:webReading.webReadingUsed},{kind:'ok',value:reading}];
 const app=load('../app/index.tsx',{
  react:h.react,'react-native':{Platform:{OS:'web'},useWindowDimensions:()=>({height:844})},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>params,router:{setParams:(next:any)=>Object.assign(params,next)}},
  '../src/store':{useStore:f.render,learnedFacts:()=>({})},'../src/profile':profile,'../src/retention':retention,'../src/ritual':ritual,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(h.react),'../src/AskBall':askBallMock(h.react),'../src/useDelight':{useDelight:()=>{}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value,activityTheme:()=>'learning'},
  '../src/SocialScreen':{Social:'Social',InstallAction:'InstallAction'},'../src/native':{haptic:()=>{},reminder:async()=>{}},
  '../src/social':{checkInCircles:async()=>{}},'../src/delight':{assignEdition:(p:any)=>p,narration:()=>null},
  '../src/questions':{validateAnswer:()=>{},factLabels:{}},
  '../src/api':{webReadingVisitor:()=>true,webReadingSpent:()=>spent,spendWebReading:()=>{spent=true},webReadingProof:async()=>({}),request:async(action:string)=>action==='predict'?outcomes[predicts++]:{kind:'ok',value:{topic:'learning',provided:{},cards:[{id:'goal',question:'Your goal?',options:['Learn'],remember:false}]}}},
 },f.warnings);
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>nodes(h.render(app.default));
 const ask=async()=>{
  render().find(n=>n.props.testID==='close-flow')?.props.onPress();
  render().find(n=>n.props.testID==='tab-sky').props.onPress();
  render().find(n=>n.type==='Social').props.onAsk('Will I learn?',false);
  render().find(n=>n.props.testID==='look-into-the-future').props.onPress();await tick();
  const option=render().find(n=>n.props.testID==='option-0');
  if(option){option.props.onPress();await tick()}
 };
 for(let attempt=1;attempt<=3;attempt++){
  await ask();
  assert.equal(predicts,attempt);
  assert.equal(spent,false);
  assert.equal(f.state().history.length,0);
  assert.ok(render().some(n=>n.type==='InstallAction'));
 }
 await ask();
 assert.equal(predicts,4);assert.equal(spent,true);
 assert.equal(f.state().history.length,1);
 await ask();assert.equal(predicts,4);
 // No backup upload to release: an anonymous visitor has no linked account.
});


test('DailyOmen saves a displayed whisper after the balance archive lock releases',async()=>{
 const storeHooks=hooks(),omenHooks=hooks();
 const {keepWhisper,lastWhisper,answerWhisper,addDays}=await import('../src/whisper');
 const {weekRecap}=await import('../src/recap');
 const day=retention.localDay(),whisper='By tonight, a small plan may change for the better.';
 let disk=JSON.stringify({facts:{},history:[],credits:0,plus:false,usage:{day,count:0}}),pause=false;
 let release!:()=>void,entered!:()=>void;
 const blocked=new Promise<void>(resolve=>{release=resolve;});
 const writing=new Promise<void>(resolve=>{entered=resolve;});
 const store=load('../src/store.tsx',{
  react:storeHooks.react,'react-native':{},'./reading-history':readings,'./profile':profile,
  './cloud':{anonymousOwner:async()=>'owner'},'./api':{},
  '@react-native-async-storage/async-storage':{getItem:async()=>disk,setItem:async(_key:string,value:string)=>{if(pause){entered();await blocked;}disk=value;}},
  './native':{cancelCheckIn:async()=>{},reopenCheckIn:()=>{}},
 },[]);
 const renderStore=()=>storeHooks.render(()=>store.Store({})).props.value;
 renderStore();await tick();renderStore();await tick();
 let finish!:(value:unknown)=>void;
 const response=new Promise(resolve=>{finish=resolve;});
 const omen=load('../src/DailyOmen.tsx',{
  react:omenHooks.react,'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
  './store':{useStore:renderStore},'./retention':retention,
  './daily-omen':{loadDailyOmen:()=>response,omenTries:2},
  './whisper':{keepWhisper,lastWhisper,answerWhisper},
  './ui':{colors:{},fonts:{},styles:{}},'./Home':{OmenCard:'OmenCard'},
 },[]);
 let reads=0;
 const renderOmen=()=>omenHooks.render(()=>omen.DailyOmen({onRead:()=>{reads++;renderStore().update((s:any)=>({...s,ritual:ritual.markStep(ritual.ritualOf(s),'omen')}))}}));
 renderOmen();pause=true;
 const applying=renderStore().applyBalance({owner:'owner',asOf:stamp(1),plus:false,plusUntil:null,packs:0,used:0,day});
 await writing;
 finish({day,text:'A little starlight invites a fresh beginning.',whisper,tries:1});await tick();
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 assert.equal(renderStore().backupBusy,true);
 assert.ok(nodes(renderOmen()).some(n=>n.props.testID==='omen-whisper'));
 assert.equal(renderStore().state.whispers,undefined);
 assert.equal(reads,0);
 pause=false;release();await applying;
 assert.equal(renderStore().backupBusy,false);
 renderOmen();renderStore();await tick();
 assert.deepEqual(JSON.parse(disk).whispers,[{day,text:whisper}]);
 assert.equal(JSON.parse(disk).ritual.days[day].omen,1);
 assert.equal(reads,1);
 renderOmen();renderStore();await tick();
 assert.equal(reads,1);
 const saved=JSON.parse(disk).whispers;
 assert.equal(saved.length,1);
 const tomorrow=addDays(day,1);
 assert.equal(lastWhisper(saved,tomorrow)?.text,whisper);
 assert.equal(weekRecap([],answerWhisper(saved,day,'yes',tomorrow),tomorrow).landed,1);
});

 test('ritual launch taps wait for hydration and listeners keep writing after backup',async t=>{
 const f=await fixture(),h=hooks();
 t.after(()=>h.unmount());
 let ready=false,subscriptions=0,cleared=0;
 const scheduled:any[]=[],alerts:string[]=[];
 let failScheduling=true;
 let onTap:((kind:string)=>void)|undefined,onActive:((state:string)=>void)|undefined;
 const app=load('../app/index.tsx',{
  react:h.react,'react-native':{Alert:{alert:(title:string)=>alerts.push(title)},Platform:{OS:'ios'},AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:()=>({remove(){}})},BackHandler:{addEventListener:()=>({remove(){}})},AppState:{addEventListener:(_event:string,callback:(state:string)=>void)=>{onActive=callback;return {remove(){onActive=undefined}}}}},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>({}),router:{setParams(){}}},
  '../src/store':{useStore:()=>{const store=f.render();return {...store,ready,update:ready?store.update:()=>{}}}},
  '../src/notify':{scheduleRitual:async(state:any)=>{scheduled.push(state);if(failScheduling)throw new Error('offline')},watchRitualTaps:(callback:(kind:string)=>void)=>{subscriptions++;onTap=callback;if(!cleared){callback('morning');cleared++}return ()=>{onTap=undefined}}},
  '../src/profile':profile,'../src/retention':retention,'../src/ritual':ritual,'../src/billing':billing,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(h.react),'../src/AskBall':askBallMock(h.react),'../src/useDelight':{useDelight(){}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value},
  '../src/social':{syncSocialProfile:async()=>{}},'../src/native':{watchCheckIns:()=>()=>{}},'../src/SocialPush':{watchSocialPushes:()=>()=>{}},
  '../src/purchases':{purchaseMode:'mock'},'../src/api':{webReadingVisitor:()=>false},
 },[]);
 const render=()=>h.render(app.default);
 render();assert.equal(subscriptions,0);assert.equal(cleared,0);
 ready=true;render();render();
 assert.equal(f.render().state.ritual.counts['tap:morning'],1);
 assert.equal(f.render().state.ritual.counts.appOpens,1);
 assert.equal(cleared,1);assert.equal(subscriptions,1);
 await tick();assert.ok(alerts.length>0);assert.ok(alerts.every(title=>title==='Notification update failed'));
 failScheduling=false;
 const before=scheduled.length;
 onActive!('background');render();assert.equal(scheduled.length,before);
 onActive!('active');render();
 assert.equal(scheduled.length,before+1);
 assert.equal(scheduled.at(-1),f.render().state);
 await f.render().backup('restore',async()=>{});render();
 onActive!('active');onTap!('evening');render();
 assert.equal(f.render().state.ritual.counts['tap:evening'],1);
 assert.equal(f.render().state.ritual.counts.appOpens,3);
 assert.equal(subscriptions,1);
 assert.equal(scheduled.at(-1),f.render().state);
 await tick();
});

for(const result of ['cached text',null,'error'] as const)test(`omen progress requires actual text: ${result}`,async()=>{
 const h=hooks(),state={facts:{},sunSign:null,ageConfirmed:true};let reads=0;
 const component=load('../src/DailyOmen.tsx',{
  react:h.react,'react-native':{AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
  './store':{useStore:()=>({state})},'./retention':retention,'./daily-omen':{loadDailyOmen:async()=>{if(result==='error')throw new Error('offline');return {day:retention.localDay(),text:result}}},
  './whisper':whisper,'./ui':{},'./Home':{},
 },[]);
 const render=()=>h.render(()=>component.DailyOmen({onRead:()=>{reads++}}));
 render();assert.equal(reads,0);await tick();render();render();
 assert.equal(reads,result==='cached text'?1:0);
});

for(const exit of ['close','another','plans','tab'])test(`leaving the notification offer through ${exit} does not repeat it`,async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,7,12)});
 const h=hooks();t.after(()=>h.unmount());let jump!:(section:string)=>void;const foreground:((state:string)=>void)[]=[];
 let state:any={onboardingDone:true,ageConfirmed:true,sunSign:null,facts:{},history:[],plus:true,reduceMotion:true,usage:{day:'2026-10-07',count:0},credits:99};
 const reading={id:'reading',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-10-07T12:00:00',dueDate:'2026-11-07',label:'Speculative',why:'',facts:{},sources:[],assumptions:[],friend:true};
 const app=load('../app/index.tsx',{
  react:h.react,'react-native':{Platform:{OS:'ios'},AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:()=>({remove(){}})},BackHandler:{addEventListener:()=>({remove(){}})},AppState:{addEventListener:(_type:string,listener:(state:string)=>void)=>{foreground.push(listener);return {remove(){}}}}},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},'expo-router':{useLocalSearchParams:()=>({}),router:{setParams(){}}},
  '../src/store':{useStore:()=>({state,ready:true,backupBusy:false,remaining:99,update:(fn:any)=>{state=fn(state)},savePrediction:async()=>{state={...state,history:[reading]}}})},
  '../src/notify':{scheduleRitual:async()=>{},watchRitualTaps:()=>()=>{}},
  '../src/profile':profile,'../src/retention':retention,'../src/ritual':ritual,'../src/billing':billing,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(h.react),'../src/AskBall':askBallMock(h.react),'../src/useDelight':{useDelight(){}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value,activityTheme:()=>'learning'},
  '../src/social':{syncSocialProfile:async()=>{},friendForecast:async()=>reading,checkInCircles:async()=>{}},
  '../src/native':{watchCheckIns:()=>()=>{},haptic(){}},'../src/SocialPush':{watchSocialPushes:(fn:any)=>{jump=fn;return ()=>{}}},
  '../src/SocialScreen':{Social:'Social'},'../src/DailyRitual':{NotifyOffer:'NotifyOffer'},
  '../src/delight':{narration:()=>null},
  '../src/purchases':{purchaseMode:'mock'},'../src/api':{webReadingVisitor:()=>false},
 },[]);
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>nodes(h.render(app.default));
 const ask=async()=>{
  jump('circles');render().find(n=>n.type==='Social').props.onAsk('Will I learn?',true,{id:'friend'});
  await render().find(n=>n.props.testID==='look-into-the-future').props.onPress();
  await tick();return render();
 };
 render();let tree=await ask();assert.ok(tree.some(n=>n.type==='NotifyOffer'));
 if(exit==='tab')jump('circles');
 else tree.find(n=>n.props.testID===({close:'close-flow',another:'ask-another-question',plans:'view-plans'}[exit as 'close'|'another'|'plans'])).props.onPress();
 render();
 if(exit==='plans'){render().find(n=>n.props.testID==='close-flow').props.onPress();render()}
 tree=await ask();assert.ok(!tree.some(n=>n.type==='NotifyOffer'));assert.equal(state.ritual.counts.optInShown,1);
 tree.find(n=>n.props.testID==='close-flow').props.onPress();render();
 t.mock.timers.setTime(new Date(2026,9,9,12).getTime());
 foreground.forEach(listener=>listener('active'));render();
 state={...state,ritual:{...state.ritual,opened:['2026-10-07','2026-10-08','2026-10-09']}};
 render();render();assert.equal(state.ritual.counts.optInShown,2);assert.equal(state.ritual.notify.reoffered,true);
});

// Shared shallow app for the ritual tests below: real ritual model, stubbed native and social edges.
function ritualApp(h:ReturnType<typeof hooks>,store:()=>any,foreground:((state:string)=>void)[],social:Record<string,unknown>={}){
 return load('../app/index.tsx',{
  react:h.react,'react-native':{Platform:{OS:'ios'},AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:()=>({remove(){}})},BackHandler:{addEventListener:()=>({remove(){}})},AppState:{addEventListener:(_type:string,listener:(state:string)=>void)=>{foreground.push(listener);return {remove(){}}}}},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},'expo-router':{useLocalSearchParams:()=>({}),router:{setParams(){}}},
  '../src/store':{useStore:store,learnedFacts:()=>({})},'../src/notify':{scheduleRitual:async()=>{},watchRitualTaps:()=>()=>{}},
  '../src/profile':profile,'../src/retention':retention,'../src/ritual':ritual,'../src/billing':billing,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(h.react),'../src/AskBall':askBallMock(h.react),'../src/useDelight':{useDelight(){}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value,activityTheme:()=>'learning'},
  '../src/social':{syncSocialProfile:async()=>{},checkInCircles:async()=>{},...social},
  '../src/native':{watchCheckIns:()=>()=>{},haptic(){}},'../src/SocialPush':{watchSocialPushes:()=>()=>{}},
  '../src/SocialScreen':{Social:'Social'},'../src/DailyRitual':{NotifyOffer:'NotifyOffer'},'../src/delight':{narration:()=>null},
  '../src/purchases':{purchaseMode:'mock'},'../src/api':{webReadingVisitor:()=>false},
 },[]);
}

test('the day-3 offer still appears once sixty opened days are stored',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date(2026,9,7,12)});
 const h=hooks();t.after(()=>h.unmount());const foreground:((state:string)=>void)[]=[];
 const opened=Array.from({length:60},(_,i)=>retention.localDay(new Date(2026,9,7-59+i,12)));
 let state:any={onboardingDone:true,ageConfirmed:true,tourSeen:true,sunSign:null,facts:{},history:[],plus:true,reduceMotion:true,usage:{day:'2026-10-07',count:0},credits:99,ritual:{...ritual.emptyRitual(),opened,notify:{daily:false,time:'08:30',offered:'2026-10-07'}}};
 const app=ritualApp(h,()=>({state,ready:true,backupBusy:false,remaining:99,update:(fn:any)=>{state=fn(state)}}),foreground);
 const render=()=>h.render(app.default);
 render();render();assert.equal(state.ritual.notify.reoffered,undefined);
 for(const day of [8,9]){t.mock.timers.setTime(new Date(2026,9,day,12).getTime());foreground.forEach(listener=>listener('active'));render();render()}
 assert.equal(state.ritual.opened.length,60);
 assert.equal(state.ritual.notify.reoffered,true);assert.equal(state.ritual.counts.optInShown,1);
});

test('a reading saved while a balance update holds the archive still completes Today',async t=>{
 const f=await fixture(),h=hooks();t.after(()=>h.unmount());const day=new Date().toISOString().slice(0,10);
 const reading={...readings.circleReading(f.card),circleId:undefined,friend:true};
 const balance={owner:'owner',asOf:stamp(1),plus:false,plusUntil:null,packs:5,used:1,day};
 let render!:()=>any[];
 // An automatic balance refresh queues behind the reading's save, so the save resolves while the archive is still locked.
 const store=()=>{const s=f.render();return {...s,savePrediction:async(...args:any[])=>{const saving=s.savePrediction(...(args as [any]));void s.applyBalance(balance);render();await saving}}};
 const app=ritualApp(h,store,[],{friendForecast:async()=>reading});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 render=()=>nodes(h.render(app.default));
 render().find(n=>n.props.testID==='tab-sky').props.onPress();
 render().find(n=>n.type==='Social').props.onAsk('Will we learn?',true,{id:'friend'});
 await render().find(n=>n.props.testID==='look-into-the-future').props.onPress();
 assert.equal(f.render().backupBusy,true);
 for(let i=0;i<4;i++){await tick();render()}
 assert.equal(f.render().backupBusy,false);
 const saved=ritual.ritualOf(f.state());
 assert.equal(saved.counts.readings,1);assert.equal(saved.days[retention.localDay()]?.ask,1);
});

test('a tapped answer holds its highlight, ignores repeat taps and drops when Back or Close comes first',async t=>{
 const h=hooks();t.after(()=>h.unmount());
 const state={onboardingDone:true,ageConfirmed:true,ageBand:'adult',tourSeen:true,sunSign:null,facts:{},history:[],plus:true,credits:9,reduceMotion:false};let predicts=0;
 const timers=new Map<number,()=>void>();let ids=0;
 const app=load('../app/index.tsx',{
  react:h.react,'react-native':{Platform:{OS:'ios'},useWindowDimensions:()=>({height:844}),AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:()=>({remove(){}})},BackHandler:{addEventListener:()=>({remove(){}})},AppState:{addEventListener:()=>({remove(){}})}},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>({}),router:{setParams(){}}},
  '../src/store':{useStore:()=>({state,ready:true,backupBusy:false,remaining:9,update:()=>{},applyBalance:async()=>{}}),learnedFacts:()=>({})},
  '../src/notify':{scheduleRitual:async()=>{},watchRitualTaps:()=>()=>{}},
  '../src/profile':profile,'../src/retention':retention,'../src/ritual':ritual,'../src/billing':billing,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/Home':homeMock(h.react),'../src/AskBall':askBallMock(h.react),'../src/useDelight':{useDelight(){}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value,activityTheme:()=>'learning'},
  '../src/SocialScreen':{Social:'Social'},'../src/social':{syncSocialProfile:async()=>{}},'../src/native':{haptic:()=>{},watchCheckIns:()=>()=>{}},'../src/SocialPush':{watchSocialPushes:()=>()=>{}},
  '../src/questions':{validateAnswer:()=>{},adaptPlan:(plan:any)=>plan,factLabels:{}},
  '../src/purchases':{purchaseMode:'mock'},'../src/motion':{motion},
  '../src/api':{webReadingVisitor:()=>false,request:async(action:string)=>{
   if(action==='plan')return {kind:'ok',value:{topic:'learning',provided:{},cards:[{id:'goal',question:'Your goal?',options:['Learn','Teach'],remember:false},{id:'pace',question:'Your pace?',options:['Slow','Fast'],remember:false}]}};
   predicts++;return new Promise(()=>{});
  }},
 },[],{Error,setTimeout:(fn:()=>void,ms:number)=>{if(ms!==motion.pick)return 0;timers.set(++ids,fn);return ids},clearTimeout:(id:number)=>timers.delete(id)});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>nodes(h.render(app.default));
 const shows=(text:string)=>render().some(n=>n.children.includes(text));
 const press=async(testID:string)=>{render().find(n=>n.props.testID===testID).props.onPress();await tick();render()};
 const elapse=async()=>{const due=[...timers.values()];timers.clear();due.forEach(fn=>fn());await tick();render()};
 render();render().find(n=>n.props.testID==='tab-sky').props.onPress();
 render().find(n=>n.type==='Social').props.onAsk('Will I learn?');
 await press('look-into-the-future');
 assert.ok(shows('Your goal?'));
 await press('option-0');await press('option-1');
 assert.equal(timers.size,1,'a second tap while the first answer holds is ignored');
 assert.equal(render().find(n=>n.props.testID==='option-0').props.accessibilityState.checked,true,'the first tapped answer keeps its highlight');
 assert.ok(shows('Your goal?'),'the tapped answer holds before the next question');
 await elapse();
 assert.ok(shows('Your pace?'));
 await press('option-0');
 await press('close-flow');
 assert.equal(timers.size,0,'Back clears the pending advance');
 assert.ok(shows('Your goal?'));await elapse();
 assert.ok(shows('Your goal?'));assert.equal(predicts,0);
 await press('option-1');await press('close-flow');
 assert.equal(timers.size,0,'Close clears the pending advance');
 await elapse();assert.ok(!shows('Your goal?'));assert.equal(predicts,0);
 render().find(n=>n.type==='Social')?.props.onAsk('Will I learn?');
 await press('look-into-the-future');
 await press('option-0');await elapse();await press('option-1');await elapse();
 assert.equal(predicts,1,'the last held answer reveals once its beat ends');
});
