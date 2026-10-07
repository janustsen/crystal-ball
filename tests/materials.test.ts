import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const manifest=JSON.parse(readFileSync(new URL('../assets/materials/manifest.json',import.meta.url),'utf8'));
function load(file:string,imports:Record<string,unknown>={}){
 const module={exports:{} as any};
 const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>{
  if(name.endsWith('manifest.json'))return manifest;
  if(name.endsWith('.png'))return `bundled:${name.split('/').pop()}`;
  if(name in imports)return imports[name];
  throw new Error(`Unexpected import: ${name}`);
 }});
 return module.exports;
}
const {material,slices}=load('../src/materials.ts');

test('every material and state resolves to a bundled file that exists, and missing states fall back to the base art',()=>{
 for(const [name,entry] of Object.entries<any>(manifest.materials)){
  for(const file of [entry.file,...Object.values(entry.states??{})])assert.ok(existsSync(new URL(`../assets/materials/${file}`,import.meta.url)),file);
  assert.equal(material(name).source,`bundled:${entry.file}`);
  for(const state of ['pressed','selected','disabled'])assert.equal(material(name,state).source,`bundled:${entry.states?.[state]??entry.file}`);
 }
});

test('9-slice tiles the box exactly, keeps corner size, shrinks corners in a small box, and maps each window to its source region',()=>{
 const m={source:0,width:360,height:150,insets:{top:36,right:30,bottom:24,left:18},fill:'stretch',scale:3};
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
 const small=slices(m,20,10);
 assert.ok(small[0].dest.width+small[2].dest.width<=20+1e-9&&small[0].dest.height+small[3].dest.height<=10+1e-9);
});

test('web draws the material as one filled border-image with the manifest insets and fill mode',()=>{
 const web=load('../src/Material.web.tsx',{react:{},'react/jsx-runtime':{jsx:()=>null},'expo-asset':{},'./materials':{}});
 const css=web.borderImage({width:360,height:150,insets:{top:36,right:30,bottom:24,left:18},fill:'round',scale:3},'/m.png');
 assert.equal(css.borderImage,'url("/m.png") 36 30 24 18 fill / 12px 10px 8px 6px / 0 round');
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
