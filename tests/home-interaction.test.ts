import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

function component(file:string,imports:Record<string,any>){
 const slots:any[]=[],effects:(()=>void)[]=[];
 let cursor=0;
 const react={
  createElement:(type:any,props:any,...children:any[])=>{
   if(props?.ref)props.ref.current??={closest:()=>null};
   return {type,props:props??{},children};
  },
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=value}]},
  useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},
  useEffect:(effect:()=>void,deps:any[])=>{
   const i=cursor++,previous=slots[i];
   if(!previous||deps.some((value,j)=>value!==previous[j]))effects.push(effect);
   slots[i]=deps;
  },
 };
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
 }).outputText;
 const jsx=(type:any,props:any)=>react.createElement(type,props,...[props.children??[]].flat());
 runInNewContext(code,{module,exports:module.exports,console:{error:()=>{}},require:(name:string)=>{
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(name in imports)return imports[name];
  throw new Error(`Unexpected import: ${name}`);
 }});
 return (name:string,props:any)=>{
  const render=()=>{cursor=0;return module.exports[name](props)};
  render();effects.splice(0).forEach(effect=>effect());return render();
 };
}
const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:[node,...(node.children??[]).flatMap(nodes)];

test('Home hero supplies touch feedback before invoking Ask, and a drag spins the ball instead',()=>{
 const events:string[]=[];
 const render=component('../src/Home.tsx',{
  'react-native':{Platform:{OS:'web'},Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
  'expo-linear-gradient':{LinearGradient:'LinearGradient'},'react-native-svg':{SvgXml:'SvgXml'},
  './Surface':{Surface:'Surface'},'./AskOrb':{AskOrb:'AskOrb'},'./Enter':{Enter:'Enter'},'./ui':{Txt:'Txt',fonts:{},colors:{},styles:{}},'./store':{useStore:()=>({state:{}})},
  './delight':{selectedStyle:()=>'classic'},
  './native':{haptic:(kind:string)=>events.push(kind)},
 });
 // The shared room now owns the scene; Home's hit target is exported as BallButton.
 const spin:any={dragged:false};
 const hero=render('BallButton',{x:175,y:560,r:18.7,home:true,spin,onPress:()=>events.push('ask')});
 hero.props.onPressIn();assert.deepEqual(events,['touch']);
 hero.props.onPress();assert.deepEqual(events,['touch','ask']);
 const ball=hero;
 spin.grab=(e:PointerEvent)=>{events.push(`grab ${e.pointerId}`);spin.dragged=true};
 ball.props.onPointerDown({nativeEvent:{pointerId:4}});
 ball.props.onPress();assert.deepEqual(events,['touch','ask','grab 4']);
 ball.props.onPress();assert.deepEqual(events,['touch','ask','grab 4','ask']);
});

test('the readings-left count pops only when a loaded balance changes',()=>{
 const render=component('../src/Home.tsx',{
  'react-native':{Platform:{OS:'web'},Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
  'expo-linear-gradient':{LinearGradient:'LinearGradient'},'react-native-svg':{SvgXml:'SvgXml'},
  './Surface':{Surface:'Surface'},'./AskOrb':{AskOrb:'AskOrb'},'./Enter':{Enter:'Enter'},'./ui':{Txt:'Txt',fonts:{},colors:{},styles:{}},'./store':{useStore:()=>({state:{}})},
  './delight':{selectedStyle:()=>'classic'},'./native':{haptic:()=>{}},
 });
 const pop=(count:string,ready:boolean,reduce=false)=>{const enter=nodes(render('PlansPill',{count,ready,reduce,onPress:()=>{}})).find(n=>n.type==='Enter');assert.equal(enter.props.kind,'count');return !enter.props.reduce};
 assert.equal(pop('Loading…',false),false);
 assert.equal(pop('1 reading left',true),false);
 assert.equal(pop('0 readings left',true),true);
 assert.equal(pop('0 readings left',true,true),false);
});

test('Today omen step scrolls to the omen, not Sunday’s recap above it',()=>{
 const scrolls:number[]=[];
 const imports={
  'react-native':{Platform:{OS:'web'},Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
  'react-native-svg':{SvgXml:'SvgXml'},'./Surface':{Surface:'Surface'},'./AskOrb':{AskOrb:'AskOrb'},'./Enter':{Enter:'Enter'},'./ui':{Txt:'Txt',RowLink:'RowLink',EdgeFade:'EdgeFade',fonts:{},colors:{},styles:{}},
  './native':{haptic:()=>{}},
 };
 const props={ready:true,libraryLocked:false,onLibrary:()=>{},checkIns:null,recap:{type:'WeekRecap',props:{},children:[]},omen:{type:'DailyOmen',props:{},children:[]},top:24,bottom:0,reduce:true};
 const render=component('../src/Home.tsx',imports);
 const tree=nodes(render('Home',{...props,omenFocus:0}));
 const measured=tree.find(n=>n.props.onLayout);
 assert.ok(tree.some(n=>n.type==='WeekRecap'));
 assert.deepEqual(nodes(measured).filter(n=>n.type==='WeekRecap'||n.type==='DailyOmen').map(n=>n.type),['DailyOmen']);
 measured.props.onLayout({nativeEvent:{layout:{y:400}}});
 tree.find(n=>n.type==='ScrollView').props.ref.current={scrollTo:({y}:{y:number})=>scrolls.push(y)};
 render('Home',{...props,omenFocus:1});
 assert.deepEqual(scrolls,[412]);
});
