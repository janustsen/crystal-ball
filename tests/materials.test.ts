import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const manifest=JSON.parse(readFileSync(new URL('../assets/materials/manifest.json',import.meta.url),'utf8'));
function load(file:string,imports:Record<string,unknown>={},json=manifest){
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>{
  if(name.endsWith('manifest.json'))return json;
  if(name==='./materialFiles')return {materialFiles:new Proxy({},{get:(_,file)=>`bundled:${String(file)}`})};
  if(name in imports)return imports[name];
  throw new Error(`Unexpected import: ${name}`);
 }});
 return module.exports;
}
const react={react:{createContext:(value:unknown)=>({value})}};
const {material,slices,capBox}=load('../src/materials.ts',react);
const states=['pressed','selected','disabled','focused','listening'];

test('every kit material is bundled, states resolve to their own entry and fall back to the base art',()=>{
 assert.equal(manifest.schema,'cb-component-kit.v1');
 const bundled=readFileSync(new URL('../src/materialFiles.ts',import.meta.url),'utf8');
 for(const [name,entry] of Object.entries<any>(manifest.materials)){
  assert.ok(existsSync(new URL(`../assets/materials/${entry.file}`,import.meta.url)),entry.file);
  assert.ok(bundled.includes(`'${entry.file}':require('../assets/materials/${entry.file}')`),entry.file);
  for(const cap of Object.keys(entry.caps??{}))assert.ok(manifest.materials[cap]?.cap,`${name} cap ${cap}`);
  if(entry.cap||states.some(s=>name.endsWith(`-${s}`)))continue;
  assert.equal(material(name).source,`bundled:${entry.file}`);
  for(const state of states)assert.equal(material(name,state).source,`bundled:${(manifest.materials[`${name}-${state}`]??entry).file}`);
 }
 assert.equal(material('brass-button','pressed').source,'bundled:brass-button-pressed.png');
 assert.equal(material('oak-button','disabled').source,'bundled:oak-button.png');
 assert.equal(material('oak-chip','selected').ink,manifest.materials['oak-chip-selected'].text_color);
});

test('9-slice tiles the box exactly, keeps corner size, shrinks corners in a small box, and maps each window to its source region',()=>{
 const m={source:0,width:360,height:150,insets:{top:36,right:30,bottom:24,left:18},outset:0,scale:3,caps:[]};
 for(const [w,h] of [[320,120],[20,10]]){
  const parts=slices(m,w,h);
  // A box smaller than both insets has no middle band, so its empty slices drop out.
  assert.equal(parts.length,w>=16&&h>=20?9:6);
  assert.ok(Math.abs(parts.reduce((n:number,p:any)=>n+p.dest.width*p.dest.height,0)-w*h)<1e-6);
  assert.ok(parts.every((p:any)=>p.dest.left>=0&&p.dest.top>=0&&p.dest.left+p.dest.width<=w+1e-9&&p.dest.top+p.dest.height<=h+1e-9));
 }
 const [tl,top,,,center,,,,br]=slices(m,320,120);
 assert.deepEqual({...tl.dest},{left:0,top:0,width:6,height:12});
 assert.deepEqual({...br.dest},{left:310,top:112,width:10,height:8});
 // The window shows exactly the source's centre region: its left edge sits at source x = left inset.
 const kx=center.dest.width/(m.width-m.insets.left-m.insets.right);
 assert.ok(Math.abs(-center.image.left/kx-m.insets.left)<1e-9);
 assert.ok(Math.abs(top.image.height-m.height*(12/36))<1e-9);
 // The kit's 3-slice pieces (zero top and bottom insets) keep only the middle row.
 assert.equal(slices({...m,insets:{top:0,right:30,bottom:0,left:18}},320,60).length,3);
});

test('a kit entry carries its text ink and shadow outset, and centres each cap on its anchor plus offset, in points',()=>{
 const kit={materials:{'parchment-note':{file:'parchment-note.png',size_px:[1122,492],insets_px:{top:120,right:120,bottom:120,left:120},outset_pt:12,text_color:'#2A190C',
  caps:{'brass-tack':{anchor:'top-center',offset_pt:[0,14]},'wax-seal-broken':{anchor:'top-right',offset_pt:[6,-5]}}},
  'brass-tack':{file:'brass-tack.png',size_px:[96,96],cap:true},'wax-seal-broken':{file:'wax-seal-broken.png',size_px:[216,208],cap:true}}};
 const m=load('../src/materials.ts',react,kit).material('parchment-note');
 assert.equal(m.ink,'#2A190C');assert.equal(m.outset,12);assert.equal(m.width,1122);
 const [tack,seal]=m.caps.map((cap:any)=>({...capBox(cap,300,120)}));
 assert.deepEqual(tack,{left:150-16,top:14-16,width:32,height:32});
 assert.deepEqual(seal,{left:300+6-36,top:-5-208/6,width:72,height:208/3});
});

test('web draws the material as one filled, stretched border-image reaching out by the shadow outset',()=>{
 const web=load('../src/Material.web.tsx',{react:{},'react/jsx-runtime':{jsx:()=>null},'expo-asset':{},'./materials':{}});
 const css=web.borderImage({width:360,height:150,insets:{top:36,right:30,bottom:24,left:18},outset:12,scale:3,caps:[]},'/m.png');
 assert.equal(css.borderImage,'url("/m.png") 36 30 24 18 fill / 12px 10px 8px 6px / 12px stretch');
});

// Surfaces draw rendered materials; only the room scene, the orb and the exported story art paint their own pixels.
test('UI components carry no hand-coded surface shadows, borders or frosted fills',()=>{
 const painters=new Set(['RoomScene.tsx','RoomScene.web.tsx','HomeScene.web.tsx','OrbVisual.tsx','GoldenGlow.tsx','Material.web.tsx','ShareCard.tsx']);
 const files=['../app/index.tsx',...readdirSync(new URL('../src',import.meta.url)).filter(f=>f.endsWith('.tsx')&&!painters.has(f)).map(f=>`../src/${f}`)];
 for(const file of files){
  const found=readFileSync(new URL(file,import.meta.url),'utf8').match(/boxShadow|border(Top|Bottom|Left|Right)?Width|borderColor|backdropFilter/g);
  assert.equal(found,null,`${file}: ${found}`);
 }
});

test('text and fields on an inked material take its ink; without one they keep the app colours',()=>{
 let ink:string|undefined;
 const flatten=(s:any):any=>Array.isArray(s)?Object.assign({},...s.flat(Infinity).filter(Boolean).map(flatten)):{...s};
 const element=(type:any,props:any)=>({type,props});
 const ui=load('../src/ui.tsx',{react:{useContext:()=>ink,useRef:()=>({current:null}),useState:(v:unknown)=>[v,()=>{}]},'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'Fragment'},
  'react-native':{StyleSheet:{create:(s:any)=>s,flatten},Text:'Text',TextInput:'TextInput',View:'View'},'./OrbVisual':{},'./Enter':{},'./motion':{},'./delight':{},'./native':{},
  './store':{useStore:()=>({state:{}})},'./Material':{Material:'Material'},'./materials':{MaterialInk:{}}});
 const color=(style:any)=>{const s=flatten(style);return [s.color,s.opacity??1]};
 assert.deepEqual(color(ui.Txt({children:'x',style:ui.styles.caption}).props.style),[ui.colors.muted,1]);
 ink='#2B1A0E';
 assert.deepEqual(color(ui.Txt({children:'x',style:ui.styles.caption}).props.style),['#2B1A0E',.78]);
 assert.deepEqual(color(ui.Txt({children:'x',display:true}).props.style),['#2B1A0E',1]);
 assert.equal(flatten(ui.Txt({children:'x',display:true}).props.style).textShadowColor,'transparent');
 const field=ui.Field({style:[ui.styles.input,{marginTop:12}],placeholderTextColor:'#999'});
 assert.deepEqual({...field.props.style},{marginTop:12});
 assert.equal(field.props.children.props.name,'input');
 const input=field.props.children.props.children,rendered=input.type(input.props);
 assert.equal(flatten(rendered.props.style).color,'#2B1A0E');
 assert.equal(rendered.props.placeholderTextColor,'#2B1A0EA6');
});
