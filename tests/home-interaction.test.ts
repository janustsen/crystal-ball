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
   if(props?.ref)props.ref.current={closest:()=>null};
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

test('Home keeps the captured ball aligned when WebGL creation fails, including resize and reduced motion',()=>{
 let attempts=0;
 const render=component('../src/HomeScene.web.tsx',{
  three:{WebGLRenderer:class {constructor(){attempts++;throw new Error('WebGL unavailable')}}},
  'react-native':{Image:'Image'},'../assets/home-scene.jpg':'captured-scene',
 });
 for(const props of [{width:390,height:844,reduce:false},{width:375,height:667,reduce:true},{width:600,height:844,reduce:true}]){
  const tree=render('HomeScene',props),image=nodes(tree).find(n=>n.type==='Image');
  assert.ok(image);
  assert.equal(image.props.source,'captured-scene');
  assert.equal(image.props.style.height,props.height);
  assert.equal(image.props.style.width,props.height*600/844);
  assert.equal(image.props.style.left+image.props.style.width/2,props.width/2);
  assert.equal(tree.props.style.pointerEvents,'none');
 }
 assert.equal(attempts,3);
});

test('Home hero supplies touch feedback before invoking Ask',()=>{
 const events:string[]=[];
 const render=component('../src/Home.tsx',{
  'react-native':{Pressable:'Pressable',ScrollView:'ScrollView',View:'View'},
  'expo-linear-gradient':{LinearGradient:'LinearGradient'},'react-native-svg':{SvgXml:'SvgXml'},
  './HomeScene':{},'./ui':{Txt:'Txt'},'./store':{useStore:()=>({state:{}})},
  './delight':{selectedStyle:()=>'classic',skinColors:{classic:{fill:'transparent',rim:'transparent'}}},
  './native':{haptic:(kind:string)=>events.push(kind)},
 });
 const hero=nodes(render('Home',{onAsk:()=>events.push('ask'),top:0,bottom:0})).find(n=>n.props.testID==='hero-orb');
 hero.props.onPressIn();assert.deepEqual(events,['touch']);
 hero.props.onPress();assert.deepEqual(events,['touch','ask']);
});
