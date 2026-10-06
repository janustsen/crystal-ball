import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {selectedStyle,styleCatalog} from '../src/delight';

const code=ts.transpileModule(readFileSync(new URL('../src/InnerLibrary.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
}).outputText;
const deferred=()=>Promise.withResolvers<any>();
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function library(serverMetered=true){
 const slots:any[]=[];
 let cursor=0,state={plus:true,ballStyle:'classic',cardStyle:'classic'};
 const requests:{ballStyle:string;cardStyle:string;pending:ReturnType<typeof deferred>}[]=[];
 const applying=deferred();
 const react={
  createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
 };
 const imports:Record<string,any>={
  react,'react-native':{Pressable:'Pressable',View:'View'},
  './ui':{Action:'Action',Orb:'Orb',Txt:'Txt',colors:{},styles:{}},
  './delight':{selectedStyle,styleCatalog},
  './store':{useStore:()=>({state,update:(fn:any)=>{state=fn(state)},applyBalance:async(balance:any)=>{await applying.promise;state={...state,...balance}})},
  './api':{serverMetered,saveStyles:(ballStyle:string,cardStyle:string)=>{
   const pending=deferred();requests.push({ballStyle,cardStyle,pending});return pending.promise;
  }},
 };
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name]});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>{cursor=0;return nodes(module.exports.InnerLibrary({onUpgrade:()=>{}}))};
 const controls=()=>render().filter(n=>n.type==='Pressable');
 const press=(id:string)=>controls().find(n=>n.props.testID===id).props.onPress();
 return {requests,controls,press,render,state:()=>state,apply:()=>applying.resolve(),failApply:()=>applying.reject(new Error('Apply failed'))};
}

test('both style selectors stay locked through save and balance application',async()=>{
 for(const first of ['ball','card']){
  for(const second of ['ball','card']){
   const room=library();
   const oldControls=room.controls();
   room.press(first+'-style-gold');
   oldControls.find(n=>n.props.testID===second+'-style-obsidian').props.onPress();
   assert.equal(room.requests.length,1,'same-frame selections cannot overlap');
   assert.ok(room.controls().every(n=>n.props.disabled&&n.props.accessibilityState.disabled));
   room.requests[0].pending.resolve(room.requests[0]);await flush();
   room.press(second+'-style-obsidian');
   assert.equal(room.requests.length,1,'balance application is also protected');
   room.apply();await flush();
   assert.ok(room.controls().every(n=>!n.props.disabled));
   room.press(second+'-style-obsidian');
   const next=room.requests[1];
   assert.equal(next[second==='ball'?'ballStyle':'cardStyle'],'obsidian');
   if(first!==second)assert.equal(next[first==='ball'?'ballStyle':'cardStyle'],'gold');
   next.pending.resolve(next);await flush();
   assert.equal(room.state()[second==='ball'?'ballStyle':'cardStyle'],'obsidian');
  }
 }
});

test('failed style saves unlock both selectors and allow retry',async()=>{
 const room=library();room.press('ball-style-gold');
 room.requests[0].pending.reject(new Error('Save failed'));await flush();
 assert.ok(room.controls().every(n=>!n.props.disabled));
 assert.ok(room.render().some(n=>n.children.includes('Save failed')));
 room.press('card-style-obsidian');
 room.requests[1].pending.resolve(room.requests[1]);room.apply();await flush();
 assert.equal(room.state().cardStyle,'obsidian');
 assert.equal(room.state().ballStyle,'classic');
 assert.ok(!room.render().some(n=>n.children.includes('Save failed')));
});

test('failed balance application releases the selectors',async()=>{
 const room=library();room.press('ball-style-gold');
 room.requests[0].pending.resolve(room.requests[0]);await flush();
 room.failApply();await flush();
 assert.ok(room.controls().every(n=>!n.props.disabled));
 assert.ok(room.render().some(n=>n.children.includes('Apply failed')));
 room.press('card-style-obsidian');
 assert.equal(room.requests.length,2);
 room.requests[1].pending.reject(new Error('Save failed'));await flush();
});

test('local selections preserve both choices even before another render',()=>{
 for(const first of ['ball','card']){
  const room=library(false),controls=room.controls();
  controls.find(n=>n.props.testID===first+'-style-gold').props.onPress();
  controls.find(n=>n.props.testID===(first==='ball'?'card':'ball')+'-style-obsidian').props.onPress();
  assert.equal(room.state()[first==='ball'?'ballStyle':'cardStyle'],'gold');
  assert.equal(room.state()[first==='ball'?'cardStyle':'ballStyle'],'obsidian');
  assert.equal(room.requests.length,0);
 }
});
