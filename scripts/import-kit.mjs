// Imports the modeled component kit into the app: re-encodes each @3x material image into assets/materials, writes
// assets/materials/manifest.json in the kit's cb-component-kit.v1 schema, and generates src/materialFiles.ts (the
// static require map React Native needs). Images become palette PNG: about a third of the size, no visible change.
//   node scripts/import-kit.mjs [kit dir]     default /Users/janustsen/dev/archive/crystal-ball-components
// Kit v2: the iMac lane's manifest.json (walnut and brass pieces) and the MacBook lane's macbook/kit/slices.json
// (walnut panel, sheet, input, tab bar, mic, share frame, receipt). A state is its own entry, <material>-<state>.
// Each entry gains the app's text_finish and the luminance of its body (5th, 50th and 95th percentile, linear),
// which the per-spot lighting uses to hold text contrast at 4.5:1 or better.
import {mkdirSync,readFileSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import sharp from 'sharp';

// Everything is built in a staging folder first, so a missing image or unmapped piece leaves the working assets intact.
const kit=process.argv[2]||'/Users/janustsen/dev/archive/crystal-ball-components',out='assets/materials',staging=`${out}.next`;
const imac=JSON.parse(readFileSync(join(kit,'manifest.json'),'utf8'));
const macbook=JSON.parse(readFileSync(join(kit,'macbook/kit/slices.json'),'utf8'));
// MacBook piece → app material (states as <material>-<state>). The kit's surfaces_on_macbook_pieces puts notices,
// errors, the omen and plaques on the walnut panel (plan.png) in its ivory ink; the error panel adds the broken seal.
const macbookNames={sheet:'sheet',modal:'modal',plan:'plan',plan_selected:'plan-selected',input:'input',input_focus:'input-focused',
 tabbar:'tabbar',tabslot:'tabslot',cradle:'cradle',mic_idle:'mic',mic_listening:'mic-listening',mic_disabled:'mic-disabled',share_frame:'share-frame',receipt_card:'receipt-card'};
const macbookCaps={badge_ribbon:'badge-ribbon'};
const walnutPanel={notice:{},'notice-error':{caps:{'wax-seal-broken':{anchor:'top-right',offset_pt:[6,-5]}}},plaque:{}};
const ivory='#F3E6CC',ink={'receipt-card':'#2A190C',notice:ivory,'notice-error':ivory,plaque:ivory,plan:ivory,'plan-selected':ivory,modal:ivory,sheet:ivory};
// Text finish by what the surface is: gilt inlay on walnut, raised letters on brass, iron-gall ink on vellum.
const finish=name=>/^(brass-|walnut-chip-selected)/.test(name)?'relief':/^(vellum|receipt)/.test(name)?'ink':/^(walnut|plan|modal|sheet|notice|plaque|tabbar|tabslot)/.test(name)?'gilt':undefined;
// Cap placements: the kit states them in prose.
const caps={'vellum-card':{'wax-seal':{anchor:'bottom-center',offset_pt:[0,0]}},'plan-selected':{'badge-ribbon':{anchor:'top-right',offset_pt:[-8,30]}}};

const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
async function encode(source,file){
 const image=sharp(source);
 await image.clone().png({palette:true,quality:92,effort:10,dither:.6}).toFile(join(staging,file));
 const {data,info}=await image.ensureAlpha().raw().toBuffer({resolveWithObject:true}),l=[];
 for(let i=0;i<data.length;i+=info.channels)if(data[i+3]>230)l.push(.2126*linear(data[i])+.7152*linear(data[i+1])+.0722*linear(data[i+2]));
 l.sort((a,b)=>a-b);
 return l.length?[.05,.5,.95].map(p=>Number(l[Math.floor(l.length*p)].toFixed(4))):null;
}

rmSync(staging,{recursive:true,force:true});mkdirSync(staging,{recursive:true});
const materials={};
async function add(name,source,entry){
 const file=`${name}.png`,luminance=await encode(source,file),text_finish=entry.cap?undefined:finish(name);
 materials[name]={file,...entry,...(caps[name]||entry.caps?{caps:{...caps[name],...entry.caps}}:{}),...(text_finish?{text_finish}:{}),...(entry.cap?{}:{luminance})};
}
for(const [name,e] of Object.entries(imac.materials)){
 if(e.cap){await add(name,join(kit,e.file),{size_px:e.size_px,cap:true});continue}
 await add(name,join(kit,e.file),{size_px:e.size_px,insets_px:e.insets_px,outset_pt:e.outset_pt??0,fixed_height_pt:e.fixed_height_pt??null,text_color:e.text_color?.match(/#[0-9A-Fa-f]{6}/)?.[0]});
}
for(const [piece,e] of Object.entries(macbook)){
 const source=join(kit,'macbook/kit',`${piece}.png`);
 if(macbookCaps[piece]){await add(macbookCaps[piece],source,{size_px:e.px,cap:true});continue}
 const name=macbookNames[piece];if(!name)throw new Error(`Unmapped MacBook piece ${piece}`);
 const c=e.capInsets_px??{top:0,right:0,bottom:0,left:0};
 const entry=n=>({size_px:e.px,insets_px:{top:c.top,right:c.right,bottom:c.bottom,left:c.left},outset_pt:0,fixed_height_pt:null,...(ink[n]?{text_color:ink[n]}:{})});
 await add(name,source,entry(name));
 if(piece==='plan')for(const [alias,extra] of Object.entries(walnutPanel))await add(alias,source,{...entry(alias),...extra});
}
writeFileSync(join(staging,'manifest.json'),JSON.stringify({schema:'cb-component-kit.v1',source:kit,materials},null,1)+'\n');
rmSync(out,{recursive:true,force:true});renameSync(staging,out);
writeFileSync('src/materialFiles.ts',`// Generated by scripts/import-kit.mjs: the bundled image for each material file.\nexport const materialFiles:Record<string,number>={\n${Object.values(materials).map(m=>` '${m.file}':require('../assets/materials/${m.file}'),`).join('\n')}\n};\n`);
console.log('%d materials: %s',Object.keys(materials).length,Object.keys(materials).join(' '));
