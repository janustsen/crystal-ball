import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const code=ts.transpileModule(readFileSync(new URL('../src/SocialScreen.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
}).outputText;
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(initiallyPending=false){
 const remote={owner:'A',profile:{handle:'a',sky_push:false,sky_push_answered:false},stars:[],schoolOnly:false,circles:[],members:[],
  schoolSuggestions:[],schools:[],reactions:[],seals:[],glows:[],moments:[],receivedSeals:[],forecasts:[],omens:[]};
 const slots:any[]=[],effects:(()=>void)[]=[];
 let cursor=0,tick=()=>{},pending:Promise<any>|undefined;
 const timers:(()=>void)[]=[];
 let finishInitial!:(value:any)=>void,failInitial!:(error:Error)=>void;
 if(initiallyPending)pending=new Promise((resolve,reject)=>{finishInitial=resolve;failInitial=reject});
 const react={
  createElement:(type:any,props:any,...children:any[])=>typeof type==='function'?type({...props,children}):({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value}]},
  useRef:(initial:any)=>slots[cursor++]??={current:initial},
  useEffect:(effect:()=>void,deps:any[])=>{const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j])){const prior=slots[i];slots[i]={deps};effects.push(()=>{prior?.cleanup?.();slots[i].cleanup=effect()})}},
 };
 const imports:Record<string,any>={
  react,'react-native':{},'expo-linking':{},'./Surface':{Surface:'Surface'},'./ui':{colors:{},styles:{},Segmented:({options,value,onChange}:any)=>options.map((o:any)=>({type:'Pressable',props:{testID:o.testID,accessibilityState:{selected:value===o.value},onPress:()=>onChange(o.value)},children:[]}))},'./Enter':{Enter:'Enter'},'./social-links':{},
  './store':{useStore:()=>({state:{plus:false,history:[]}})},'./SchoolPicker':{SchoolPicker:'SchoolPicker'},'./SocialExtras':{},'./SkyOmen':{},
  './SocialPush':{SkyPushPrompt:'Prompt',SocialPush:'Settings'},
  './social-policy':{accountSocialProfile:()=>({}),sampleStars:[],skyPrompts:{love:{label:'Love',question:'What lies ahead?',x:50,y:50}},socialUnavailable:'Social is offline.'},
  './social':{
   loadSocial:()=>{const result=pending??Promise.resolve(structuredClone(remote));pending=undefined;return result},
   setSkyPush:async(enabled:boolean)=>{remote.profile.sky_push=enabled;remote.profile.sky_push_answered=true},
  },
 };
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name],Error,setInterval:(fn:()=>void)=>{tick=fn;return 0},clearInterval:()=>{},setTimeout:(fn:()=>void)=>{timers.push(fn);return 0},clearTimeout:()=>{}});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>{cursor=0;const result=nodes(module.exports.Social({reduce:true,onInviteHandled:()=>{}}));effects.splice(0).forEach(effect=>effect());return result};
 const section=(name:string)=>render().find(n=>n.props.testID===`social-section-${name}`).props.onPress();
 const prompt=()=>render().find(n=>n.type==='Prompt').props;
 const settings=()=>render().find(n=>n.type==='Settings').props;
 const hold=(start=true)=>{
  const snapshot=structuredClone(remote);
  let resolve!:(value:any)=>void,reject!:(error:Error)=>void;
  pending=new Promise((yes,no)=>{resolve=yes;reject=no});if(start)tick();
  return {finish:()=>resolve(snapshot),fail:()=>reject(new Error('Old request failed'))};
 };
 return {render,section,prompt,settings,hold,refresh:()=>tick(),remote,elapse:()=>timers.splice(0).forEach(fn=>fn()),finishInitial:()=>finishInitial(structuredClone(remote)),failInitial:()=>failInitial(new Error('Offline'))};
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

for(const section of ['sky','circles']){
 test(`${section} waits for a complete snapshot and retains it during school refresh`,async()=>{
  const f=fixture(true);f.render();f.section(section);f.elapse();
  assert.ok(!f.render().some(n=>n.type==='Enter'),'elapsed time cannot reveal partial content');
  assert.ok(f.render().some(n=>n.children.includes('Loading your sky…')));
  f.finishInitial();await settle();
  const before=f.render().find(n=>n.type==='Enter');
  assert.ok(before);
  const pending=f.hold(false);
  f.render().find(n=>n.type==='SchoolPicker').props.onSaved();
  assert.deepEqual(f.render().filter(n=>n.type==='Enter'||n.type==='SchoolPicker'||n.type==='Prompt'||n.type==='Settings').map(n=>n.type),
   [before.type,'SchoolPicker',section==='sky'?'Prompt':'Settings'],'school save retains the rendered snapshot');
  pending.fail();await settle();
  assert.ok(f.render().some(n=>n.type==='SchoolPicker'));
 });
 test(`${section} preserves offline content on initial failure and retry`,async()=>{
  const f=fixture(true);f.render();f.section(section);f.failInitial();await settle();
  assert.ok(f.render().some(n=>n.type==='Enter'));
  assert.ok(!f.render().some(n=>n.type==='SchoolPicker'));
  assert.ok(f.render().some(n=>n.children.includes('Social is offline.')));
  f.section('sky');
  assert.ok(f.render().some(n=>n.children.includes('What lies ahead?')));
  assert.equal(typeof f.render().find(n=>n.props.label==='Ask this too')?.props.onPress,'function');
  const retry=f.hold();f.elapse();
  assert.ok(f.render().some(n=>n.children.includes('What lies ahead?')));
  assert.equal(typeof f.render().find(n=>n.props.label==='Ask this too')?.props.onPress,'function');
  retry.finish();await settle();
  assert.ok(f.render().some(n=>n.type==='SchoolPicker'));
  assert.ok(f.render().some(n=>n.type==='Enter'));
 });
}
