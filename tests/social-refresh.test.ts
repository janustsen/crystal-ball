import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

test('a failed refresh after a failed action keeps loaded circles visible',async()=>{
 const snapshot={owner:'A',profile:{handle:'a'},stars:[],schoolOnly:false,circles:[{id:'c1',owner_id:'A'}],members:[{circle_id:'c1',user_id:'A'}],
  schoolSuggestions:[],schools:[],reactions:[],seals:[],glows:[],moments:[],receivedSeals:[],forecasts:[],omens:[]};
 const slots:any[]=[],effects:(()=>void)[]=[];
 let cursor=0,reads=0;
 const react={
  createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),
  useState:(initial:any)=>{
   const index=cursor++;
   if(!(index in slots))slots[index]=initial;
   return [slots[index],(value:any)=>{slots[index]=typeof value==='function'?value(slots[index]):value}];
  },
  useRef:(initial:any)=>slots[cursor++]??={current:initial},
  useEffect:(effect:()=>void,deps:any[])=>{
   const index=cursor++;
   if(!slots[index]||deps.some((value,i)=>value!==slots[index][i])){slots[index]=deps;effects.push(effect)}
  },
 };
 const imports:Record<string,any>={
  react,'react-native':{},'expo-linking':{},'./ui':{colors:{},styles:{}},'./social-links':{},
  './store':{useStore:()=>({state:{plus:false,history:[]}})},'./SchoolPicker':{},'./SocialExtras':{},'./SocialPush':{},'./SkyOmen':{},
  './social-policy':{accountSocialProfile:()=>({}),skyPrompts:{},socialUnavailable:'Social is offline.'},
  './social':{
   loadSocial:async()=>{if(++reads>1)throw new Error('offline');return snapshot},
   createCircle:async()=>{throw new Error('Network request failed')},
  },
 };
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL('../src/SocialScreen.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
 }).outputText;
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name],Error,setInterval:()=>0,clearInterval:()=>{}});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>{
  cursor=0;
  const tree=module.exports.Social({showCircles:true,reduce:true,onInviteHandled:()=>{}});
  effects.splice(0).forEach(effect=>effect());
  return nodes(tree);
 };
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 const texts=()=>render().flatMap(node=>node.children.filter((child:any)=>typeof child==='string'));
 render();await settle();
 assert.ok(render().some(node=>node.props.label==='Invite a friend'));
 render().find(node=>node.props.label==='Create my circle').props.onPress();
 await settle();render();await settle();
 assert.equal(reads,2);
 assert.ok(render().some(node=>node.props.label==='Invite a friend'));
 assert.ok(texts().includes('Network request failed'));
 assert.ok(texts().includes('Social is offline.'));
});
