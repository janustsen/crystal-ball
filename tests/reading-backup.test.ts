import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as readings from '../src/reading-history';
import * as profile from '../src/profile';
import * as retention from '../src/retention';

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
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]??{},AbortController,setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},console:{warn:(message:string)=>warnings.push(message)}});
 return module.exports;
}
async function fixture(){
 const day=new Date().toISOString().slice(0,10),warnings:string[]=[],uploads:string[][]=[];
 let disk=JSON.stringify({onboardingDone:true,ageConfirmed:true,ageBand:'adult',backupOwner:'owner',sunSign:null,facts:{},history:[],credits:2,plus:false,usage:{day,count:1},reduceMotion:true,largeText:false});
 const card={id:'receipt',asker_id:'owner',circle_id:'circle',charged_at:null,question:'Will we learn?',headline:'A shared skill awaits.',due_date:'2099-01-01',created_at:new Date().toISOString()};
 let fail!:(error:Error)=>void,blocking=true;
 const remote=new Promise<void>((_resolve,reject)=>{fail=reject});
 const h=hooks();
 const storeModule=load('../src/store.tsx',{
  react:h.react,'react-native':{},'./reading-history':readings,'./profile':profile,
  './cloud':{mirror:async(state:any)=>{uploads.push(state.history.map((p:any)=>p.id));if((state.history.length||state.circleCharges?.length)&&blocking)await remote},restoreBackup:async(state:any)=>({...state,history:[],facts:{}})},
  './social':{publishCircleForecast:async()=>card,markCircleCharged:async()=>{}},
  '@react-native-async-storage/async-storage':{getItem:async()=>disk,setItem:async(_key:string,value:string)=>{disk=value}},
  './daily-omen':{forgetOmen:async()=>{}},'./native':{forgetCheckIns:async()=>{}},'./omen-widget':{updateOmenWidget:()=>{}},
 },warnings);
 const render=()=>h.render(()=>storeModule.Store({})).props.value;
 render();await tick();render();await tick();
 return {render,card,warnings,uploads,state:()=>JSON.parse(disk),fail:()=>{blocking=false;fail(new Error('backup offline'))}};
}

for(const friend of [false,true])test(`${friend?'friend':'personal'} reveal survives backup failure after local commit`,async()=>{
 const f=await fixture(),h=hooks(false),params:any={};
 const reading={...readings.circleReading(f.card),circleId:undefined,friend};
 const app=load('../app/index.tsx',{
  react:h.react,'react-native':{Platform:{OS:'web'},useWindowDimensions:()=>({height:844})},
  'react-native-safe-area-context':{useSafeAreaInsets:()=>({top:0,bottom:0})},
  'expo-router':{useLocalSearchParams:()=>params,router:{setParams:(next:any)=>Object.assign(params,next)}},
  '../src/store':{useStore:f.render,learnedFacts:()=>({})},'../src/profile':profile,'../src/retention':retention,
  '../src/ui':{colors:{},fonts:{},styles:{}},'../src/useDelight':{useDelight:()=>{}},
  '../src/social-policy':{accountSocialProfile:()=>({}),readingIdentity:(value:any)=>value,activityTheme:()=> 'learning'},
  '../src/SocialScreen':{Social:'Social'},'../src/native':{haptic:()=>{},reminder:async()=>{}},
  '../src/social':{friendForecast:async()=>reading,checkInCircles:async()=>{}},'../src/delight':{assignEdition:(p:any)=>p},
  '../src/questions':{validateAnswer:()=>{},factLabels:{}},
  '../src/api':{request:async(action:string)=>({kind:'ok',value:action==='predict'?reading:{topic:'learning',provided:{},cards:[{id:'goal',question:'Your goal?',options:['Learn'],remember:false}]}})},
 },f.warnings);
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>nodes(h.render(app.default));
 render().find(n=>n.props.testID==='tab-sky').props.onPress();
 render().find(n=>n.type==='Social').props.onAsk('Will we learn?',friend,friend?{id:'friend'}:undefined);
 void render().find(n=>n.props.testID==='look-into-the-future').props.onPress();await tick();
 if(!friend){render().find(n=>n.props.testID==='option-0').props.onPress();await tick()}
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

for(const mode of ['publish','recover'])for(const replacement of ['forget','restore'])test(`Circle ${mode} completes before backup and orders ${replacement}`,async()=>{
 const f=await fixture();let completed=false;
 const work=f.render().settleCircle(mode==='publish'?'draft':f.card).then(()=>{completed=true});
 await tick();assert.equal(completed,true);await work;
 assert.equal(f.state().credits,1);f.render();await tick();
 {
  let replaced=false;
  const store=f.render();
  const replacing=(replacement==='forget'?store.forgetAll():store.backup('restore',async()=>{})).then(()=>{replaced=true});
  await tick();assert.equal(replaced,false);
  f.fail();await replacing;assert.equal(replaced,true);
 }
 await f.render().settleCircle(f.card);f.render();await tick();
 assert.equal(f.state().credits,1);assert.deepEqual(f.state().history,[]);
});
