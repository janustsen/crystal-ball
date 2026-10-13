import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

test('social refresh preserves circles and repeated navigation exposes visible Sky omens',async()=>{
 const snapshot={owner:'A',profile:{handle:'a',school_id:null as string|null},stars:[],schoolOnly:false,circles:[{id:'c1',owner_id:'A'}],members:[{circle_id:'c1',user_id:'A'}],
  schoolSuggestions:[],schools:[],reactions:[],seals:[],glows:[],moments:[],receivedSeals:[],forecasts:[],omens:[{circle_id:'c1',school_id:null,omen:'A shared Circle omen.'},{circle_id:null,school_id:'school',omen:'A shared school omen.'}]};
 const slots:any[]=[],effects:(()=>void)[]=[];
 let cursor=0,reads=0;
 const react={
  createElement:(type:any,props:any,...children:any[])=>typeof type==='function'?type({...props,children}):({type,props:props??{},children}),
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
  react,'react-native':{},'expo-linking':{},'./Surface':{Surface:'Surface'},'./ui':{colors:{},styles:{},Segmented:({options,value,onChange}:any)=>options.map((o:any)=>({type:'Pressable',props:{testID:o.testID,accessibilityState:{selected:value===o.value},onPress:()=>onChange(o.value)},children:[]}))},'./Enter':{Enter:'Enter'},'./social-links':{},
  './store':{useStore:()=>({state:{plus:false,history:[]}})},'./SchoolPicker':{},'./SocialExtras':{},'./SocialPush':{},'./SkyOmen':{SkyOmen:'SkyOmen'},
  './social-policy':{accountSocialProfile:()=>({}),sampleStars:[],skyPrompts:{love:{label:'Love',question:'What lies ahead?',x:50,y:50}},socialUnavailable:'Social is offline.'},
  './social':{
   loadSocial:async()=>{if(++reads>1)throw new Error('offline');return snapshot},
   createCircle:async()=>{throw new Error('Network request failed')},
  },
 };
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL('../src/SocialScreen.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
 }).outputText;
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name],Error,setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{}});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];
 let requestedSection:'sky'|'circles'='circles',requestId='first',invite:string|undefined;
 const render=()=>{
  cursor=0;
  const tree=module.exports.Social({requestedSection,requestId,invite,reduce:true,onInviteHandled:()=>{}});
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
 const selected=()=>render().find(node=>node.props.testID===`social-section-${requestedSection}`).props.accessibilityState.selected;
 requestedSection='sky';requestId='sky-one';render();assert.equal(selected(),true);
 assert.deepEqual(render().filter(node=>node.type==='SkyOmen').map(node=>node.props.omen.omen),['A shared Circle omen.']);
 render().find(node=>node.props.testID==='social-section-circles').props.onPress();
 assert.equal(selected(),false);
 requestId='sky-two';render();assert.equal(selected(),true);
 requestedSection='circles';requestId='circles-one';render();assert.equal(selected(),true);
 render().find(node=>node.props.testID==='social-section-sky').props.onPress();
 assert.equal(selected(),false);
 requestId='circles-two';render();assert.equal(selected(),true);
 snapshot.profile.school_id='school';requestedSection='sky';requestId='sky-three';render();
 assert.deepEqual(render().filter(node=>node.type==='SkyOmen').map(node=>node.props.omen.omen),['A shared school omen.','A shared Circle omen.']);
 invite='circle-invitation';requestId='sky-four';render();
 assert.equal(render().find(node=>node.props.testID==='social-section-circles').props.accessibilityState.selected,true);
 assert.ok(render().some(node=>node.props.label==='Join this circle'));
 requestId='sky-five';render();assert.equal(selected(),true);
});
