import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as delight from '../src/delight';
import * as readings from '../src/reading-history';
import * as profile from '../src/profile';

const deferred=()=>Promise.withResolvers<void>();
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function hooks(){
 const slots:any[]=[],effects:(()=>void)[]=[];let cursor=0;
 const react={
  createContext:()=>({Provider:'Provider'}),
  createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(value:any)=>{slots[i]=value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:(effect:()=>void,deps:any[])=>{const i=cursor++;if(!slots[i]||deps.some((d,j)=>d!==slots[i][j])){slots[i]=deps;effects.push(effect)}},
 };
 return {react,render:(fn:()=>any)=>{cursor=0;const result=fn();effects.splice(0).forEach(effect=>effect());return result}};
}
function load(path:string,imports:Record<string,any>){
 const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
 }).outputText;
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,React:imports.react,Error,require:(name:string)=>imports[name],performance,console,setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{}});
 return module.exports;
}
async function library(serverMetered=true){
 const storeHooks=hooks();
 let roomHooks=hooks(),serial=0;
 let server={owner:'owner',asOf:'',plus:true,plusUntil:'2099-01-01',packs:0,used:0,day:new Date().toISOString().slice(0,10),ballStyle:'classic',cardStyle:'classic'};
 const requests:{ballStyle:string;cardStyle:string;pending:ReturnType<typeof deferred>}[]=[];
 let persistence:ReturnType<typeof deferred>|undefined,failRead=false;
 const snapshot=()=>({...server,asOf:`2026-10-06T00:00:00.${String(++serial).padStart(6,'0')}Z`});
 const store=load('../src/store.tsx',{
  react:storeHooks.react,'react-native':{},
  './reading-history':readings,'./profile':profile,
  './cloud':{anonymousOwner:async()=>'owner',mirror:async()=>{}},
  './api':{serverMetered,loadBalance:async()=>{if(failRead)throw new Error('Read failed');return snapshot()},saveStyles:async(ballStyle:string,cardStyle:string)=>{
   const pending=deferred();requests.push({ballStyle,cardStyle,pending});await pending.promise;
   server={...server,ballStyle,cardStyle};return snapshot();
  }},
  '@react-native-async-storage/async-storage':{getItem:async()=>JSON.stringify({facts:{},history:[],credits:0,plus:true}),setItem:async()=>{await persistence?.promise}},
  './native':{cancelCheckIn:async()=>{},reopenCheckIn:()=>{}},'./daily-omen':{},'./omen-widget':{},'./social':{},
 });
 const state=()=>storeHooks.render(()=>store.Store({})).props.value;
 state();await flush();state();await flush();
 const room=()=>load('../src/InnerLibrary.tsx',{
  react:roomHooks.react,'react-native':{Image:'Image',Pressable:'Pressable',View:'View'},
  './Surface':{Surface:'Surface'},'./ui':{Action:'Action',Orb:'Orb',Txt:'Txt',colors:{},styles:{}},'./OrbVisual':{OrbVisual:'OrbVisual'},
  './roomAssets':{ballArt:{smoke:{},aurora:{},obsidian:{},gold:{}}},
  './delight':delight,'./store':{useStore:state},
 });
 let component=room();
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>nodes(roomHooks.render(()=>component.InnerLibrary({onUpgrade:()=>{}})));
 const controls=()=>render().filter(n=>n.type==='Pressable');
 const press=(id:string)=>controls().find(n=>n.props.testID===id).props.onPress();
 return {requests,controls,press,render,state,remount:()=>{roomHooks=hooks();component=room()},blockPersistence:()=>persistence=deferred(),failReads:()=>{failRead=true}};
}

test('Store guards both selectors across room remounts through persistence',async()=>{
 for(const first of ['ball','card'])for(const second of ['ball','card']){
  const room=await library(),oldControls=room.controls(),disk=room.blockPersistence();
  room.press(first+'-style-gold');
  oldControls.find(n=>n.props.testID===second+'-style-obsidian').props.onPress();
  await flush();assert.equal(room.requests.length,1);
  room.remount();
  assert.ok(room.controls().every(n=>n.props.disabled&&n.props.accessibilityState.disabled));
  room.press(second+'-style-obsidian');await flush();
  assert.equal(room.requests.length,1);
  room.requests[0].pending.resolve();await flush();
  room.remount();room.press(second+'-style-obsidian');await flush();
  assert.equal(room.requests.length,1,'persistence remains protected after remount');
  disk.resolve();await flush();
  assert.ok(room.controls().every(n=>!n.props.disabled));
  room.press(second+'-style-obsidian');await flush();
  const next=room.requests[1];
  assert.equal(next[second==='ball'?'ballStyle':'cardStyle'],'obsidian');
  if(first!==second)assert.equal(next[first==='ball'?'ballStyle':'cardStyle'],'gold');
  next.pending.resolve();await flush();
  assert.equal(room.state().state[second==='ball'?'ballStyle':'cardStyle'],'obsidian');
 }
});

test('a server save followed by failed persistence cannot overwrite the untouched style',async()=>{
 for(const first of ['ball','card']){
  const room=await library(),disk=room.blockPersistence();
  room.press(first+'-style-gold');await flush();
  room.requests[0].pending.resolve();await flush();
  disk.reject(new Error('Disk failed'));await flush();
  assert.ok(room.controls().every(n=>!n.props.disabled));
  assert.ok(room.render().some(n=>n.children.includes('Disk failed')));
  room.blockPersistence().resolve();
  room.remount();
  const second=first==='ball'?'card':'ball';
  room.press(second+'-style-obsidian');await flush();
  assert.equal(room.requests[1][first==='ball'?'ballStyle':'cardStyle'],'gold');
  room.requests[1].pending.resolve();await flush();
  assert.equal(room.state().state[first==='ball'?'ballStyle':'cardStyle'],'gold');
  assert.equal(room.state().state[second==='ball'?'ballStyle':'cardStyle'],'obsidian');
 }
});

test('failed saves allow retry; failed balance reads never send stale styles',async()=>{
 const room=await library();room.press('ball-style-gold');await flush();
 room.requests[0].pending.reject(new Error('Save failed'));await flush();
 assert.ok(room.controls().every(n=>!n.props.disabled));
 assert.ok(room.render().some(n=>n.children.includes('Save failed')));
 room.press('card-style-obsidian');await flush();
 room.requests[1].pending.resolve();await flush();
 assert.equal(room.state().state.cardStyle,'obsidian');
 assert.ok(!room.render().some(n=>n.children.includes('Save failed')));
 room.failReads();room.press('ball-style-gold');await flush();
 assert.equal(room.requests.length,2);
 assert.ok(room.controls().every(n=>!n.props.disabled));
});

test('local selections preserve both choices before another render',async()=>{
 for(const first of ['ball','card']){
  const room=await library(false),controls=room.controls();
  controls.find(n=>n.props.testID===first+'-style-gold').props.onPress();
  controls.find(n=>n.props.testID===(first==='ball'?'card':'ball')+'-style-obsidian').props.onPress();
  assert.equal(room.state().state[first==='ball'?'ballStyle':'cardStyle'],'gold');
  assert.equal(room.state().state[first==='ball'?'cardStyle':'ballStyle'],'obsidian');
  assert.equal(room.requests.length,0);
 }
});
