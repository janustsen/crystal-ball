import {createContext} from 'react';
import manifest from '../assets/materials/manifest.json';

// The UI's rendered materials: every surface (notice, button, input, chip, card, bar) draws one of these behind its
// live content instead of hand-coded fills, borders and shadows. assets/materials/manifest.json follows the component
// kit's cb-component-kit.v1 schema: each name's @3x image, 9-slice insets in image pixels, state images, optional
// text_color and decorative caps. scripts/material-placeholders.mjs writes the interim room crops.
const scale=3;
export type MaterialName=keyof typeof manifest.materials;
export type MaterialState='pressed'|'selected'|'disabled';
type Insets={top:number;right:number;bottom:number;left:number};
type Cap={image:string;size_px:[number,number];anchor:string;offset_pt:[number,number]};
type Entry={image:string;size_px:[number,number];insets_px:Insets;repeat?:'stretch'|'repeat'|'round';text_color?:string;caps?:Record<string,Cap>}&Partial<Record<MaterialState,string>>;

// Swap point: a kit image that keeps its file name drops in with no code change; a new file name is one line here.
const files:Record<string,number>={
 'parchment-note.png':require('../assets/materials/parchment-note.png'),
 'parchment-note-error.png':require('../assets/materials/parchment-note-error.png'),
 'brass-button.png':require('../assets/materials/brass-button.png'),
 'brass-button-pressed.png':require('../assets/materials/brass-button-pressed.png'),
 'brass-button-disabled.png':require('../assets/materials/brass-button-disabled.png'),
 'oak-button.png':require('../assets/materials/oak-button.png'),
 'oak-button-pressed.png':require('../assets/materials/oak-button-pressed.png'),
 'oak-button-disabled.png':require('../assets/materials/oak-button-disabled.png'),
 'oak-chip.png':require('../assets/materials/oak-chip.png'),
 'oak-chip-selected.png':require('../assets/materials/oak-chip-selected.png'),
 'vellum-card.png':require('../assets/materials/vellum-card.png'),
 'brass-plaque.png':require('../assets/materials/brass-plaque.png'),
 'oak-panel.png':require('../assets/materials/oak-panel.png'),
 'oak-panel-selected.png':require('../assets/materials/oak-panel-selected.png'),
 'leather-strip.png':require('../assets/materials/leather-strip.png'),
 'leather-strip-selected.png':require('../assets/materials/leather-strip-selected.png'),
 'glass-input.png':require('../assets/materials/glass-input.png'),
 'wax-card.png':require('../assets/materials/wax-card.png'),
};

// Sizes and offsets in points. A cap is a decorative piece (tack, seal) centred on its anchor point plus its offset.
export type MaterialCap={source:number;width:number;height:number;x:number;y:number;offset:[number,number]};
export type Material={source:number;width:number;height:number;insets:Insets;fill:'stretch'|'repeat'|'round';scale:number;ink?:string;caps:MaterialCap[]};
// A state without its own art falls back to the base image.
export function material(name:MaterialName,state?:MaterialState):Material{
 const entry=manifest.materials[name] as unknown as Entry,image=state&&entry[state]||entry.image;
 const caps=Object.values(entry.caps??{}).map(cap=>{
  const [v,h]=cap.anchor.split('-');
  return {source:files[cap.image],width:cap.size_px[0]/scale,height:cap.size_px[1]/scale,x:h==='left'?0:h==='right'?1:.5,y:v==='top'?0:v==='bottom'?1:.5,offset:cap.offset_pt};
 });
 return {source:files[image],width:entry.size_px[0],height:entry.size_px[1],insets:entry.insets_px,fill:entry.repeat??'stretch',scale,ink:entry.text_color,caps};
}
// The text colour of the material a Txt or Field sits on; undefined keeps the app's own colours.
export const MaterialInk=createContext<string|undefined>(undefined);

export type Box={left:number;top:number;width:number;height:number};
export function capBox(cap:MaterialCap,width:number,height:number):Box{
 return {left:cap.x*width+cap.offset[0]-cap.width/2,top:cap.y*height+cap.offset[1]-cap.height/2,width:cap.width,height:cap.height};
}

export type Slice={dest:Box;image:Box};
// 9-slice: corners keep their size (insets / scale, shrunk to fit a small box), edges stretch along one axis, the centre
// along both. Each slice is a clipped window onto the whole image, scaled so its source region fills the window.
// Zero insets (the kit's 3-slice pieces) simply drop the empty rows.
export function slices(m:Material,width:number,height:number):Slice[]{
 const fit=(a:number,b:number,size:number)=>{const k=Math.min(1,size/((a+b)/m.scale||1));return [a/m.scale*k,b/m.scale*k]};
 const [l,r]=fit(m.insets.left,m.insets.right,width),[t,b]=fit(m.insets.top,m.insets.bottom,height);
 const cols=[[0,m.insets.left,0,l],[m.insets.left,m.width-m.insets.right,l,width-r],[m.width-m.insets.right,m.width,width-r,width]];
 const rows=[[0,m.insets.top,0,t],[m.insets.top,m.height-m.insets.bottom,t,height-b],[m.height-m.insets.bottom,m.height,height-b,height]];
 return rows.flatMap(([sy0,sy1,dy0,dy1])=>cols.map(([sx0,sx1,dx0,dx1])=>{
  const kx=(dx1-dx0)/(sx1-sx0),ky=(dy1-dy0)/(sy1-sy0);
  return {dest:{left:dx0,top:dy0,width:dx1-dx0,height:dy1-dy0},image:{left:-sx0*kx,top:-sy0*ky,width:m.width*kx,height:m.height*ky}};
 })).filter(s=>s.dest.width>0&&s.dest.height>0&&Number.isFinite(s.image.width+s.image.height));
}
