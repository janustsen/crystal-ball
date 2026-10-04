import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import type {AccountState} from '../src/types';

test('school invitations never reuse filtered circles or another suggestion’s invitation',async()=>{
 const snapshot={owner:'A',profile:{school_id:'school',age_band:'teen'},stars:[],schoolOnly:false,
  circles:[{id:'occupied',owner_id:'A'}],members:[{circle_id:'occupied',user_id:'A'}],
  schoolSuggestions:[{circle_id:'occupied',user_id:'C'},{circle_id:'occupied',user_id:'D'}],
  schools:[],reactions:[],seals:[],glows:[],moments:[],receivedSeals:[],forecasts:[]};
 const slots:any[]=[],effects:(()=>void)[]=[];
 let cursor=0,created=0,reads=0;
 const invited:string[]=[],checked:(string|undefined)[]=[];
 const valid=new Set<string>();
 const react={
  createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),
  useState:(initial:any)=>{
   const index=cursor++;
   if(!(index in slots))slots[index]=initial;
   return [slots[index],(value:any)=>{slots[index]=typeof value==='function'?value(slots[index]):value}];
  },
  useRef:(initial:any)=>{
   const index=cursor++;
   return slots[index]??(slots[index]={current:initial});
  },
  useEffect:(effect:()=>void,deps:any[])=>{
   const index=cursor++;
   if(!slots[index]||deps.some((value,i)=>value!==slots[index][i])){slots[index]=deps;effects.push(effect)}
  },
 };
 let state:AccountState={sunSign:null,ageBand:'teen',onboardingDone:true,ageConfirmed:true,facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,largeText:false};
 const imports:Record<string,any>={
  react,'react-native':{},'expo-linking':{createURL:(_:string,{queryParams}:any)=>`circle=${queryParams.circle}`},
  './ui':{colors:{},styles:{}},'./store':{useStore:()=>({state,backupBusy:false})},'./SchoolPicker':{},'./SocialExtras':{},'./SocialPush':{},
  './social-policy':{accountSocialProfile:()=>({}),skyPrompts:{}},
  './social':{
   loadSocial:async()=>++reads===1?snapshot:new Promise(()=>{}),
   createSchoolCircleInvite:async(previous?:string)=>{
    checked.push(previous);
    if(previous&&valid.has(previous))return previous;
    const id=`new-${++created}`,token=`token-${id}`;
    invited.push(id);valid.add(token);return token;
   },
   inviteToCircle:async(id:string)=>{invited.push(id);return `token-${id}`},
  },
 };
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL('../src/SocialScreen.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
 }).outputText;
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name],setInterval:()=>0,clearInterval:()=>{}});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 const render=()=>{
  cursor=0;
  const tree=module.exports.Social({invite:'incoming',reduce:true,onInviteHandled:()=>{}});
  effects.splice(0).forEach(effect=>effect());
  return nodes(tree);
 };
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 render();await settle();
 const start=async(index:number)=>{
  render().filter(node=>node.props.label?.startsWith('Start a school circle'))[index].props.onPress();
  await settle();
  return render().find(node=>node.props.url)?.props.url;
 };
 assert.equal(await start(0),'circle=token-new-1');
 assert.deepEqual(invited,['new-1']);
 assert.equal(await start(0),'circle=token-new-1');
 assert.equal(created,1);
 assert.deepEqual(checked,[undefined,'token-new-1']);
 assert.deepEqual(invited,['new-1']);
 assert.equal(await start(1),'circle=token-new-2');
 assert.deepEqual(invited,['new-1','new-2']);
 assert.equal(await start(0),'circle=token-new-1');
 snapshot.profile.school_id='other-school';
 assert.equal(await start(0),'circle=token-new-3');
 snapshot.owner='other-account';
 assert.equal(await start(0),'circle=token-new-4');
 assert.equal(created,4);
 snapshot.owner='A';
 render().find(node=>node.props.label==='Invite a friend').props.onPress();
 await settle();
 assert.equal(render().find(node=>node.props.url)?.props.url,'circle=token-occupied');
 assert.deepEqual(invited,['new-1','new-2','new-3','new-4','occupied']);
 for(const id of [3,5,6]){
  valid.delete(`token-new-${id}`);
  assert.equal(await start(0),`circle=token-new-${created}`);
  assert.equal(checked.at(-1),`token-new-${id}`);
  assert.equal(created,id===3?5:id+1);
 }
});
