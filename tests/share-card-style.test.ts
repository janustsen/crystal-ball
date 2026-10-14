import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {selectedStyle} from '../src/delight';

function load(file:string,imports:Record<string,unknown>,react:unknown){
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
 }).outputText;
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,React:react,require:(name:string)=>imports[name]??{}});
 return module.exports;
}
const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:Array.isArray(node)?node.flatMap(nodes):[node,...node.children.flatMap(nodes)];

test('native preview and capture preserve every card style and golden override',async()=>{
 for(const os of ['ios','android'])for(const kind of ['forecast','receipt','golden-set','week','year'])for(const golden of kind==='golden-set'?[true]:[false,true])for(const cardStyle of ['classic','gold','obsidian']){
  const slots:any[]=[];let cursor=0,captured:any,shared=false;
  const react={
   createElement:(type:any,props:any,...children:any[])=>{const node={type,props:props??{},children};if(props?.ref)props.ref.current=node;return node},
   useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=value}]},
   useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},useEffect:()=>{},
  };
  const ui={Txt:'Txt',Orb:'Orb',Action:'Action',colors:{ink:'#17100C',gold:'#D7AD64'},fonts:{},styles:{}};
  const reveal=load('../src/RevealClip.tsx',{'./ui':ui},react);
  const imports={react,'react-native':{View:'View',Pressable:'Pressable',Platform:{OS:os}},'./ui':ui,'./RevealClip':reveal,'./social-links':{webAddress:()=>'crystal.example'},
   './delight':{selectedStyle},'./store':{useStore:()=>({state:{plus:true,cardStyle}})},'./Surface':{Surface:'Surface'},
   'react-native-view-shot':{captureRef:async(ref:any)=>{captured=ref.current;return 'capture.png'}},
   'expo-file-system':{Paths:{cache:'cache'},File:class{uri='export.png';async base64(){return 'image'}write(){}}},
   'expo-sharing':{shareAsync:async()=>{shared=true}},
  };
  const {ShareCard}=load('../src/ShareCard.tsx',imports,react);
  const card={kind,golden,headlines:['A glimpse'],labels:kind==='forecast'?[]:['Learning'],footer:'Check back',file:'card.png'};
  const render=()=>{cursor=0;return nodes(ShareCard({card,onNotice:()=>{},onClose:()=>{}}))};
  const expected=golden?['#1A120B',ui.colors.gold,2]:cardStyle==='gold'?[ui.colors.ink,ui.colors.gold,1]:cardStyle==='obsidian'?['#0E0D11','rgba(176,180,198,.55)',1]:[ui.colors.ink,'rgba(227,199,143,.22)',2/3];
  const check=(tree:any[])=>{
   assert.equal(tree.find(n=>n.props.style?.backgroundColor)?.props.style.backgroundColor,expected[0]);
   const border=tree.find(n=>n.props.style?.borderWidth)?.props.style;
   assert.ok(border,`${os} ${kind} ${cardStyle} golden=${golden}: visible outline`);
   assert.equal(border.borderColor,expected[1]);assert.equal(border.borderWidth,expected[2]);
   assert.ok(tree.some(n=>n.children.includes('A glimpse')));
  };
  const preview=render();check(preview);
  await preview.find(n=>n.props.testID==='export-story-card').props.onPress();
  check(nodes(captured));assert.equal(shared,true);
  preview.find(n=>n.props.testID==='preview-story-card').props.onPress();
  const full=render();check(full);
  await full.find(n=>n.props.label==='Export story card').props.onPress();check(nodes(captured));
 }
});

test('native three-lights preview and capture preserve each ball and line',async()=>{
 for(const os of ['ios','android'])for(const kind of ['three-lights'])for(const golden of [false])for(const cardStyle of ['classic','gold','obsidian']){
  const slots:any[]=[];let cursor=0,captured:any,shared=false;
  const react={
   createElement:(type:any,props:any,...children:any[])=>{const node={type,props:props??{},children};if(props?.ref)props.ref.current=node;return node},
   useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=value}]},
   useRef:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial})},useEffect:()=>{},
  };
  const ui={Txt:'Txt',Orb:'Orb',Action:'Action',colors:{ink:'#17100C',gold:'#D7AD64'},fonts:{},styles:{}};
  const reveal=load('../src/RevealClip.tsx',{'./ui':ui},react);
  const imports={react,'react-native':{View:'View',Pressable:'Pressable',Platform:{OS:os}},'./ui':ui,'./RevealClip':reveal,
   './delight':{selectedStyle},'./store':{useStore:()=>({state:{plus:true,cardStyle}})},'./Surface':{Surface:'Surface'},'react-native-svg':{SvgXml:'SvgXml'},'./three-lights':{lightBall:(rgb:string)=>`<svg>${rgb}</svg>`},
   'react-native-view-shot':{captureRef:async(ref:any)=>{captured=ref.current;return 'capture.png'}},
   'expo-file-system':{Paths:{cache:'cache'},File:class{uri='export.png';async base64(){return 'image'}write(){}}},
   'expo-sharing':{shareAsync:async()=>{shared=true}},
  };
  const {ShareCard}=load('../src/ShareCard.tsx',imports,react);
  const lights=['Sun','Moon','Rising'].map((name,i)=>({key:name.toLowerCase(),name,sign:'Leo',line:`${name} line`,color:`${i},0,0`}));
  const card={kind,golden,headlines:[],labels:[],footer:'Check back',file:'card.png',lights};
  const render=()=>{cursor=0;return nodes(ShareCard({card,onNotice:()=>{},onClose:()=>{}}))};
  const expected=golden?['#1A120B',ui.colors.gold,2]:cardStyle==='gold'?[ui.colors.ink,ui.colors.gold,1]:cardStyle==='obsidian'?['#0E0D11','rgba(176,180,198,.55)',1]:[ui.colors.ink,'rgba(227,199,143,.22)',2/3];
  const check=(tree:any[])=>{
   assert.equal(tree.find(n=>n.props.style?.backgroundColor)?.props.style.backgroundColor,expected[0]);
   const border=tree.find(n=>n.props.style?.borderWidth)?.props.style;
   assert.ok(border,`${os} ${kind} ${cardStyle} golden=${golden}: visible outline`);
   assert.equal(border.borderColor,expected[1]);assert.equal(border.borderWidth,expected[2]);
   {assert.deepEqual(tree.filter(n=>n.type==='SvgXml').map(n=>n.props.xml),['<svg>0,0,0</svg>','<svg>1,0,0</svg>','<svg>2,0,0</svg>']);for(const light of lights)assert.ok(tree.some(n=>n.children.includes(light.line)),light.line);}
  };
  const preview=render();check(preview);
  await preview.find(n=>n.props.testID==='export-story-card').props.onPress();
  check(nodes(captured));assert.equal(shared,true);
  preview.find(n=>n.props.testID==='preview-story-card').props.onPress();
  const full=render();check(full);
  await full.find(n=>n.props.label==='Export story card').props.onPress();check(nodes(captured));
 }
});
