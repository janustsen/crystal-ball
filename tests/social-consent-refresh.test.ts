import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const code=ts.transpileModule(readFileSync(new URL('../src/SocialScreen.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
}).outputText;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const remote={owner:'A',profile:{handle:'a',sky_push:false,sky_push_answered:false},stars:[],schoolOnly:false,circles:[],members:[],
  schoolSuggestions:[],schools:[],reactions:[],seals:[],glows:[],moments:[],receivedSeals:[],forecasts:[],omens:[]};
 const slots:any[]=[],effects:(()=>void)[]=[];
 let cursor=0,tick=()=>{},pending:Promise<any>|undefined;
 const react={
  createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>slots[cursor++]??={current:initial},
  useEffect:(effect:()=>void,deps:any[])=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j])){const prior=slots[i];slots[i]={deps};effects.push(()=>{prior?.cleanup?.();slots[i].cleanup=effect()})}},
 };
 const imports:Record<string,any>={
  react,'react-native':{},'expo-linking':{},'./ui':{colors:{},styles:{}},'./social-links':{},
  './store':{useStore:()=>({state:{plus:false,history:[]}})},'./SchoolPicker':{},'./SocialExtras':{},'./SkyOmen':{},
  './SocialPush':{SkyPushPrompt:'Prompt',SocialPush:'Settings'},
  './social-policy':{accountSocialProfile:()=>({}),sampleStars:[],skyPrompts:{love:{label:'Love',question:'What lies ahead?',x:50,y:50}},socialUnavailable:'Social is offline.'},
  './social':{
   loadSocial:()=>{const result=pending??Promise.resolve(structuredClone(remote));pending=undefined;return result},
   setSkyPush:async(enabled:boolean)=>{remote.profile.sky_push=enabled;remote.profile.sky_push_answered=true},
  },
 };
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name],Error,setInterval:(fn:()=>void)=>{tick=fn;return 0},clearInterval:()=>{}});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>{cursor=0;const result=nodes(module.exports.Social({reduce:true,onInviteHandled:()=>{}}));effects.splice(0).forEach(effect=>effect());return result};
 const section=(name:string)=>render().find(n=>n.props.testID===`social-section-${name}`).props.onPress();
 const prompt=()=>render().find(n=>n.type==='Prompt').props;
 const settings=()=>render().find(n=>n.type==='Settings').props;
 const hold=()=>{
  const snapshot=structuredClone(remote);
  let resolve!:(value:any)=>void,reject!:(error:Error)=>void;
  pending=new Promise((yes,no)=>{resolve=yes;reject=no});tick();
  return {finish:()=>resolve(snapshot),fail:()=>reject(new Error('Old request failed'))};
 };
 return {render,section,prompt,settings,hold,refresh:()=>tick(),remote};
}

test('late snapshots cannot restore the prompt or undo either acceptance step',async()=>{
 const f=fixture();f.render();await settle();
 for(const enabled of [false,true]){
  const old=f.hold();
  f.remote.profile.sky_push=enabled;f.remote.profile.sky_push_answered=true;
  f.prompt().onAnswered(enabled);
  old.finish();await settle();
  assert.equal(f.prompt().answered,true);
  f.section('circles');assert.equal(f.settings().skyPush,enabled);f.section('sky');
 }
 const failed=f.hold();f.prompt().onAnswered(true);failed.fail();await settle();
 assert.ok(!f.render().some(n=>n.children.includes('Social is offline.')));
 f.remote.profile.sky_push=false;f.refresh();await settle();
 f.section('circles');assert.equal(f.settings().skyPush,false,'a later refresh still updates the preference');
 f.section('sky');assert.equal(f.prompt().answered,true);
});

test('settings changes in either direction also invalidate earlier snapshots',async()=>{
 const f=fixture();f.render();await settle();f.section('circles');
 for(const enabled of [true,false]){
  const old=f.hold();
  await f.settings().onSkyPush(enabled);
  old.finish();await settle();
  assert.equal(f.settings().skyPush,enabled);
  f.section('sky');assert.equal(f.prompt().answered,true);f.section('circles');
  await settle();
 }
});
