import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as realSky from '../src/real-sky';
// Home shows tonight's sky for a fixed day.
const sky={'./retention':{localDay:()=>'2026-10-14'},'./real-sky':realSky};

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
const nodes=(node:any):any[]=>Array.isArray(node)?node.flatMap(nodes):!node||typeof node!=='object'?[]:[node,...(node.children??[]).flatMap(nodes)];

test('the room and ball-target Shifts ease together to a new Home offset, and reduced motion moves them at once',()=>{
 const moves:any[]=[],sets:number[]=[];
 class Value{constructor(public value:number){}setValue(value:number){this.value=value;sets.push(value)}stopAnimation(){}}
 const imports={
  'react-native':{Platform:{OS:'ios'},Animated:{Value,View:'Animated.View',timing:(value:Value,config:any)=>({start(){moves.push({value,...config})},stop(){}})},
   Easing:{ease:'ease',inOut:(easing:string)=>`inOut(${easing})`},Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
  'expo-linear-gradient':{LinearGradient:'LinearGradient'},'react-native-svg':{SvgXml:'SvgXml'},
  './Surface':{Surface:'Surface'},'./AskOrb':{AskOrb:'AskOrb'},'./Enter':{Enter:'Enter'},'./ui':{Txt:'Txt',fonts:{},colors:{},styles:{}},'./store':{useStore:()=>({state:{}})},
  './delight':{selectedStyle:()=>'classic'},'./native':{haptic:()=>{}},
 };
 const shifts=[component('../src/Home.tsx',imports),component('../src/Home.tsx',imports)];
 for(const render of shifts)render('Shift',{offset:0,reduce:false});
 moves.length=0;
 const trees=shifts.map(render=>render('Shift',{offset:-107,reduce:false}));
 assert.deepEqual(moves.map(({value,...config})=>config),[0,1].map(()=>({toValue:-107,duration:450,easing:'inOut(ease)',useNativeDriver:true})));
 trees.forEach((tree,i)=>assert.equal(tree.props.style.transform[0].translateY,moves[i].value,'each wrapper moves by its eased value'));
 moves.length=0;
 for(const render of shifts)render('Shift',{offset:0,reduce:true});
 assert.deepEqual(moves,[]);
 assert.deepEqual(sets,[0,0]);
 // Before layout the offset is unknown: the first measured one is placed, not eased from zero.
 const early=component('../src/Home.tsx',imports);
 early('Shift',{reduce:false});early('Shift',{offset:-107,reduce:false});
 assert.deepEqual(moves,[]);
 assert.deepEqual(sets,[0,0,-107]);
});

test('Home hero supplies touch feedback before invoking Ask, and a drag spins the ball instead',()=>{
 const events:string[]=[];
 const render=component('../src/Home.tsx',{
  ...sky,'react-native':{Platform:{OS:'web'},Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
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
  ...sky,'react-native':{Platform:{OS:'web'},Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
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
  ...sky,'react-native':{Platform:{OS:'web'},Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
  'react-native-svg':{SvgXml:'SvgXml'},'./Surface':{Surface:'Surface'},'./AskOrb':{AskOrb:'AskOrb'},'./Enter':{Enter:'Enter'},'./ui':{Txt:'Txt',RowLink:'RowLink',EdgeFade:'EdgeFade',fonts:{},colors:{},styles:{}},
  './native':{haptic:()=>{}},
 };
 for(const recap of [null,{type:'WeekRecap',props:{},children:[]}]){
  for(const last of [undefined,{day:'2026-10-10',text:'A message may arrive.'},{day:'2026-10-10',text:'A message may arrive.',outcome:'yes',checkedInAt:'2026-10-11'}]){
   for(const current of [null,{day:'2026-10-11',text:null,tries:2},{day:'2026-10-11',text:'A door opens.'}]){
    const scrolls:{y:number;animated:boolean}[]=[];
    const daily=component('../src/DailyOmen.tsx',{
     ...imports,'@react-native-async-storage/async-storage':{},
     './daily-omen':{omenTries:2},'./retention':{localDay:()=>'2026-10-11',currentOmen:()=>current},'./real-sky':realSky,
     './api':{},'./store':{useStore:()=>({state:{whispers:last?[last]:[]}})},
     './Home':{OmenCard:'OmenCard'},'./whisper':{lastWhisper:()=>last},'./story-card':{omenCard:()=>null},
    },false);
    const render=component('../src/Home.tsx',imports);
    const props={ready:true,libraryLocked:false,onLibrary:()=>{},checkIns:null,recap,omen:(cardRef:any)=>daily('DailyOmen',{cardRef}),top:400,under:96,bottom:0,reduce:true};
    const tree=nodes(render('Home',{...props,omenFocus:0}));
    assert.equal(tree.some(n=>typeof n.type==='function'),!!last);
    const card=tree.find(n=>n.type==='OmenCard');
    const view=render('OmenCard',card.props);
    let y=100+(recap?300:0)+(last?220:0);
    const content=tree.find(n=>n.type==='View'&&n.props.ref);
    view.props.ref.current={measureLayout:(ancestor:any,done:(x:number,y:number)=>void)=>{assert.equal(ancestor,content.props.ref.current);done(0,y)}};
    tree.find(n=>n.type==='ScrollView').props.ref.current={scrollTo:(position:{y:number;animated:boolean})=>scrolls.push({...position})};
    render('Home',{...props,omenFocus:1});
    assert.deepEqual(scrolls,[{y:y+256,animated:false}]);
    // Answering the whisper moves the card without a new onLayout event on web.
    y-=52;
    render('Home',{...props,omenFocus:2,reduce:false});
    assert.deepEqual(scrolls[1],{y:y+256,animated:true});
   }
  }
 }
});

test('every room header exposes Settings beside Plans and Home omits its title',()=>{
 const events:string[]=[];
 const render=component('../src/Home.tsx',{
  ...sky,'react-native':{Platform:{OS:'web'},Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
  'react-native-svg':{SvgXml:'SvgXml'},'./Surface':{Surface:'Surface'},'./AskOrb':{AskOrb:'AskOrb'},'./Enter':{Enter:'Enter'},
  './ui':{Txt:'Txt',fonts:{},colors:{},styles:{}},'./native':{haptic:()=>{}},
 });
 for(const title of ['', 'Sky','Ask','History','You','Inner Library','The Ball asks','Settings']){
  for(const ready of [false,true]){
   const tree=render('RoomHeader',{title,count:'1 reading left',ready,settings:title==='Settings',top:59,onPlans:()=>events.push('plans'),onSettings:()=>events.push('settings')});
   const all=nodes(tree),settings=all.find(n=>n.props.testID==='open-settings');
   assert.equal(settings.props.disabled,!ready);
   assert.equal(settings.props.accessibilityState.selected,title==='Settings');
   assert.equal(all.some(n=>n.props.accessibilityRole==='header'),!!title);
   const row=all.find(n=>n.children.includes(settings));
   const plans=row.children.find((n:any)=>typeof n.type==='function');
   assert.ok(plans,'Plans shares the Settings row');
   assert.equal(plans.props.ready,ready);
   if(ready){plans.props.onPress();settings.props.onPress();assert.deepEqual(events.splice(0),['plans','settings'])}
  }
 }
 const bar=nodes(render('HomeTabBar',{current:'History',disabled:false,reduce:true,bottom:34,onTab:(tab:string)=>events.push(tab)}));
 const tabs=bar.filter(n=>n.props.accessibilityRole==='tab');
 assert.equal(tabs.length,5);
 for(const tab of tabs)tab.props.onPress();
 assert.deepEqual(events,['Home','Sky','Ask','History','You']);
 assert.equal(tabs.find(n=>n.props.accessibilityState.selected).props.testID,'tab-history');
});

test('shared Screen renders content and forwards directional motion',()=>{
 const render=component('../src/ui.tsx',{
  ...sky,'react-native':{Platform:{OS:'web'},StyleSheet:{create:(styles:any)=>styles},View:'View',Animated:{Value:class {},ScrollView:'ScrollView'}},
  './OrbVisual':{},'./Enter':{Enter:'Enter'},'./motion':{},'./delight':{},'./native':{},'./store':{},
  'react-native-svg':{},'@react-native-masked-view/masked-view':{},'expo-linear-gradient':{},'./Surface':{onGold:'#140E0A'},
 });
 for(const direction of [-1,1]){
  const tree=nodes(render('Screen',{children:'Settings content',reduce:true,direction,top:120,under:96}));
  const enter=tree.find(n=>n.type==='Enter');
  assert.equal(enter.props.direction,direction);
  assert.equal(enter.props.reduce,true);
  assert.ok(tree.some(n=>n.children.includes('Settings content')));
 }
});
