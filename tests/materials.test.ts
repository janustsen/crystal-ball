import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const manifest=JSON.parse(readFileSync(new URL('../assets/materials/manifest.json',import.meta.url),'utf8'));
function load(file:string,imports:Record<string,unknown>={},json=manifest){
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 runInNewContext(code,{module,exports:module.exports,process:{env:{}},require:(name:string)=>{
  if(name.endsWith('manifest.json'))return json;
  if(name in imports)return imports[name];
  if(name==='./materialFiles')return load('../src/materialFiles.ts');
  if(name.endsWith('.png')){
   assert.ok(existsSync(new URL(name,new URL(file,import.meta.url))),name);
   return `bundled:${name.split('/').pop()}`;
  }
  throw new Error(`Unexpected import: ${name}`);
 }});
 return module.exports;
}
const react={react:{createContext:(value:unknown)=>({value})}};
const {material,slices,capBox}=load('../src/materials.ts',react);
const states=['pressed','selected','disabled','focused','listening'];

test('every kit material is bundled, states resolve to their own entry and fall back to the base art',()=>{
 assert.equal(manifest.schema,'cb-component-kit.v1');
 const bundled=load('../src/materialFiles.ts').materialFiles;
 for(const [name,entry] of Object.entries<any>(manifest.materials)){
  assert.ok(existsSync(new URL(`../assets/materials/${entry.file}`,import.meta.url)),entry.file);
  assert.equal(bundled[entry.file],`bundled:${entry.file}`);
  for(const cap of Object.keys(entry.caps??{}))assert.ok(manifest.materials[cap]?.cap,`${name} cap ${cap}`);
  if(entry.cap||states.some(s=>name.endsWith(`-${s}`)))continue;
  assert.equal(material(name).source,`bundled:${entry.file}`);
  for(const state of states)assert.equal(material(name,state).source,`bundled:${(manifest.materials[`${name}-${state}`]??entry).file}`);
 }
 assert.equal(material('brass-button','pressed').source,'bundled:brass-button-pressed.png');
 assert.equal(material('walnut-button','disabled').source,'bundled:walnut-button.png');
 assert.equal(material('walnut-chip','selected').ink,manifest.materials['walnut-chip-selected'].text_color);
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
 const materialFiles=Object.fromEntries(Object.values(kit.materials).map(entry=>[entry.file,`bundled:${entry.file}`]));
 const m=load('../src/materials.ts',{...react,'./materialFiles':{materialFiles}},kit).material('parchment-note');
 assert.equal(m.ink,'#2A190C');assert.equal(m.outset,12);assert.equal(m.width,1122);
 const [tack,seal]=m.caps.map((cap:any)=>({...capBox(cap,300,120)}));
 assert.deepEqual(tack,{left:150-16,top:14-16,width:32,height:32});
 assert.deepEqual(seal,{left:300+6-36,top:-5-208/6,width:72,height:208/3});
});

test('web draws the material as one filled, stretched border-image and lights it with a gradient masked to the art',()=>{
 const web=load('../src/Material.web.tsx',{react:{},'react/jsx-runtime':{jsx:()=>null},'expo-asset':{},'./materials':{},'./lighting':lightingModule});
 const art={width:360,height:150,insets:{top:36,right:30,bottom:24,left:18},outset:12,scale:3,caps:[]};
 assert.equal(web.borderImage(art,'/m.png').borderImage,'url("/m.png") 36 30 24 18 fill / 12px 10px 8px 6px / 12px stretch');
 // Light from the left: the gradient runs left (lit, warm) to right (dimmed) and is masked by the same 9-slice.
 const layer=web.lightLayer(art,'/m.png',{near:1.1,far:.6,color:[1,.6,.3],dir:[-1,0]});
 assert.equal(layer.background,'linear-gradient(90.0deg, rgba(255,153,77,0.100), rgba(0,0,0,0.400))');
 assert.equal(layer.WebkitMaskBoxImage,'url("/m.png") 36 30 24 18 / 12px 10px 8px 6px stretch');
});

const lightingModule=load('../src/lighting.ts',{...react,'./room':load('../src/room.ts',{'./roomTrack.json':JSON.parse(readFileSync(new URL('../src/roomTrack.json',import.meta.url),'utf8'))}),'./materials':load('../src/materials.ts',react)});
const lum=(hex:string)=>[1,3,5].map(i=>{const v=parseInt(hex.slice(i,i+2),16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
test('the room lights a surface from its spot: brighter and warmer near the source, dimmer away from it',()=>{
 const {lightAt,shade}=lightingModule,ask={spot:'Ask',x:0,y:0,width:390,height:844};
 // Ask's candle is at the left of the desk (render x 178, y 1235): a point beside it outshines one across the room.
 const near=lightAt(ask,60,420),far=lightAt(ask,340,780);
 assert.ok(near.exposure>far.exposure*1.5);
 assert.ok(near.color[0]>near.color[2]);
 assert.ok(near.dir[0]<0&&far.dir[0]<0&&far.dir[1]<0);
 const panel=shade(ask,material('notice'),{x:16,y:560,width:358,height:120});
 assert.ok(panel.near>panel.far&&panel.far>=.45&&panel.near<=1.2);
 // Sky's skylight is cool blue overhead.
 const sky=lightAt({...ask,spot:'Sky'},195,300);
 assert.ok(sky.color[2]>sky.color[0]);
});

test('lighting never takes the text on a material below 4.5:1 against its body',()=>{
 const {exposureRange}=lightingModule,{inkColor}=load('../src/materials.ts',react);
 for(const [name,entry] of Object.entries<any>(manifest.materials)){
  if(entry.cap||!entry.text_color||name.endsWith('-disabled'))continue;
  const m=material(name),text=lum(inkColor(m)),[p5,p50,p95]=m.luminance,[lo,hi]=exposureRange(m,inkColor(m));
  // The worst body under the letters: toward the bright end under light text, the darkest 5% under dark ink.
  for(const e of [lo,hi]){
   const bg=(text>p50?Math.sqrt(p50*p95):p5)*e,ratio=(Math.max(text,bg)+.05)/(Math.min(text,bg)+.05);
   assert.ok(ratio>=4.5-1e-9||lo===hi,`${name} at ${e}: ${ratio.toFixed(2)}`);
  }
 }
});

test('text and fields on an inked material take its ink; without one they keep the app colours',()=>{
 let ink:any;
 const flatten=(s:any):any=>Array.isArray(s)?Object.assign({},...s.flat(Infinity).filter(Boolean).map(flatten)):{...s};
 const element=(type:any,props:any)=>({type,props});
 const ui=load('../src/ui.tsx',{react:{useContext:()=>ink,useRef:()=>({current:null}),useState:(v:unknown)=>[v,()=>{}]},'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'Fragment'},
  'react-native':{StyleSheet:{create:(s:any)=>s,flatten},Platform:{OS:'ios'},Text:'Text',TextInput:'TextInput',View:'View'},'./OrbVisual':{},'./Enter':{},'./motion':{},'./delight':{},'./native':{},
  './store':{useStore:()=>({state:{}})},'./Material':{Material:'Material'},'./materials':{MaterialInk:{},gilt:'#E2C48A'}});
 const color=(style:any)=>{const s=flatten(style);return [s.color,s.opacity??1]};
 // Over the room, secondary text takes a lighter step so it holds contrast inside its halo.
 assert.deepEqual(color(ui.Txt({children:'x',style:ui.styles.caption}).props.style),['#E6DDCF',1]);
 // Over the room, display text has a soft shadow, not a hard die-cut offset.
 assert.ok(flatten(ui.Txt({children:'x',display:true}).props.style).textShadowRadius>=4);
 ink={color:'#2B1A0E',finish:'ink',dir:[-1,0]};
 // Dark ink stays solid even for secondary text; only gilt keeps a lighter weight.
 assert.deepEqual(color(ui.Txt({children:'x',style:ui.styles.caption}).props.style),['#2B1A0E',1]);
 assert.deepEqual(color(ui.Txt({children:'x',display:true}).props.style),['#2B1A0E',1]);
 assert.equal(flatten(ui.Txt({children:'x',display:true}).props.style).textShadowColor,'transparent');
 // Gilt inlay: gold leaf with a hairline recess above; translucent labels keep their weight.
 ink={color:'#F3E6CC',finish:'gilt',dir:[0,-1]};
 const g=flatten(ui.Txt({children:'x',style:{color:'rgba(242,231,210,.62)'}}).props.style);
 assert.deepEqual([g.color,g.opacity,g.textShadowOffset.height],['#E2C48A',.62,-1]);
 // Raised brass letters: the relief shadow falls away from the light (here from the upper left, so down and right).
 ink={color:'#F3E6CC',finish:'relief',dir:[-.7,-.7]};
 const r=flatten(ui.Txt({children:'x'}).props.style);
 assert.deepEqual([r.color,r.textShadowOffset.width,r.textShadowOffset.height],['#F3E6CC',1,1]);
 ink={color:'#2B1A0E',finish:'ink',dir:[-1,0]};
 const field=ui.Field({style:[ui.styles.input,{marginTop:12}],placeholderTextColor:'#999'});
 assert.deepEqual({...field.props.style},{marginTop:12});
 assert.equal(field.props.children.props.name,'input');
 const input=field.props.children.props.children,rendered=input.type(input.props);
 assert.equal(flatten(rendered.props.style).color,'#2B1A0E');
 assert.equal(rendered.props.placeholderTextColor,'#2B1A0EA6');
});


test('native material lighting follows room and material changes without another layout',()=>{
 let room={spot:'Home',x:0,y:0,width:390,height:844},cursor=0,measurements=0;
 const slots:any[]=[],effects:(()=>void)[]=[];
 const box={x:16,y:100,width:358,height:70};
 const ref={current:{measureInWindow:(done:Function)=>{measurements++;done(box.x,box.y,box.width,box.height)}}};
 const hooks={
  useContext:()=>room,useRef:()=>ref,
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=value}]},
  useEffect:(effect:()=>void,deps:any[])=>{const i=cursor++,previous=slots[i];if(!previous||deps.some((value,j)=>!Object.is(value,previous[j])))effects.push(effect);slots[i]=deps},
 };
 const element=(type:any,props:any)=>({type,props});
 const {Material}=load('../src/Material.tsx',{react:hooks,'react/jsx-runtime':{jsx:element,jsxs:element},
  'react-native':{View:'View',Image:'Image'},'./materials':load('../src/materials.ts',react),'./lighting':lightingModule});
 let props:any={name:'brass-badge',children:'Balance'};
 const render=()=>{cursor=0;return Material(props)};
 const settle=()=>{render();effects.splice(0).forEach(effect=>effect());return render()};
 let tree=settle();
 tree.props.children[0].props.onLayout({nativeEvent:{layout:box}});
 function check(){
  tree=settle();
  const expected=lightingModule.shade(room,material(props.name,props.state,props.detail),box,props.state==='focused');
  assert.deepEqual([...tree.props.children[1].props.value.dir],[...expected.dir]);
  const cast=lightingModule.castOffset(expected.dir);
  assert.deepEqual({...tree.props.children[0].props.style.shadowOffset},{width:cast.x,height:cast.y});
  const art=material(props.name,props.state,props.detail),o=art.outset;
  const tiles=tree.props.children[0].props.children.props.children;
  slices(art,box.width+2*o,box.height+2*o).forEach((slice:any,i:number)=>{
   const e=lightingModule.exposureAt(expected,slice.dest.left+slice.dest.width/2-o-box.width/2,slice.dest.top+slice.dest.height/2-o-box.height/2,box.width,box.height);
   const tint=lightingModule.exposureTint(e,expected.color),overlay=tiles[i].props.children[1];
   assert.equal(tiles[i].props.children[0].props.source,art.source);
   if(tint.alpha>.01){assert.equal(overlay.props.tintColor,`rgb(${tint.rgb.join(',')})`);assert.equal(overlay.props.style.opacity,tint.alpha)}else assert.equal(overlay,null);
  });
 }
 check();
 for(const patch of [{spot:'Sky'},{spot:'Home'},{x:40},{y:60},{width:700},{height:1000}]){
  room={...room,...patch};check();
 }
 for(const patch of [{name:'tabbar'},{name:'input'},{state:'focused'},{state:undefined},{detail:6}]){
  props={...props,...patch};const before=measurements;check();assert.equal(measurements,before+1);
 }
 const before=measurements;room={...room};check();assert.equal(measurements,before);
 box.width=300;box.height=90;
 tree.props.children[0].props.onLayout({nativeEvent:{layout:box}});check();
});
