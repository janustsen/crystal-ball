import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

function component(file:string,imports:Record<string,any>,effectsEnabled=true){
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
  render();effects.splice(0).forEach(effect=>{if(effectsEnabled)effect()});return render();
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

test('Today omen step targets the actual card after recap and yesterday’s whisper',()=>{
 const imports={
  'react-native':{Platform:{OS:'web'},Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
  'react-native-svg':{SvgXml:'SvgXml'},'./Surface':{Surface:'Surface'},'./AskOrb':{AskOrb:'AskOrb'},'./Enter':{Enter:'Enter'},'./ui':{Txt:'Txt',RowLink:'RowLink',EdgeFade:'EdgeFade',fonts:{},colors:{},styles:{}},
  './native':{haptic:()=>{}},
 };
 for(const recap of [null,{type:'WeekRecap',props:{},children:[]}]){
  for(const last of [undefined,{day:'2026-10-10',text:'A message may arrive.'},{day:'2026-10-10',text:'A message may arrive.',outcome:'yes',checkedInAt:'2026-10-11'}]){
   for(const current of [null,{day:'2026-10-11',text:null,tries:2},{day:'2026-10-11',text:'A door opens.'}]){
    const scrolls:{y:number;animated:boolean}[]=[];
    const daily=component('../src/DailyOmen.tsx',{
     ...imports,'@react-native-async-storage/async-storage':{},
     './daily-omen':{omenTries:2},'./retention':{localDay:()=>'2026-10-11',currentOmen:()=>current},
     './api':{},'./store':{useStore:()=>({state:{whispers:last?[last]:[]}})},
     './Home':{OmenCard:'OmenCard'},'./whisper':{lastWhisper:()=>last},
    },false);
    const render=component('../src/Home.tsx',imports);
    const props={ready:true,libraryLocked:false,onLibrary:()=>{},checkIns:null,recap,omen:(cardRef:any)=>daily('DailyOmen',{cardRef}),top:24,bottom:0,reduce:true};
    const tree=nodes(render('Home',{...props,omenFocus:0}));
    assert.equal(tree.some(n=>typeof n.type==='function'),!!last);
    const card=tree.find(n=>n.type==='OmenCard');
    const view=render('OmenCard',card.props);
    let y=100+(recap?300:0)+(last?220:0);
    const content=tree.find(n=>n.type==='View'&&n.props.ref);
    view.props.ref.current={measureLayout:(ancestor:any,done:(x:number,y:number)=>void)=>{assert.equal(ancestor,content.props.ref.current);done(0,y)}};
    tree.find(n=>n.type==='ScrollView').props.ref.current={scrollTo:(position:{y:number;animated:boolean})=>scrolls.push({...position})};
    render('Home',{...props,omenFocus:1});
    assert.deepEqual(scrolls,[{y:y+12,animated:false}]);
    // Answering the whisper moves the card without a new onLayout event on web.
    y-=52;
    render('Home',{...props,omenFocus:2,reduce:false});
    assert.deepEqual(scrolls[1],{y:y+12,animated:true});
   }
  }
 }
});
