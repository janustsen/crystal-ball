import manifest from '../assets/materials/manifest.json';

// The UI's rendered materials: every surface (notice, button, input, chip, card, bar) draws one of these behind its
// live content instead of hand-coded fills, borders and shadows. assets/materials/manifest.json maps each name to its
// art and 9-slice insets (source pixels at manifest.scale); scripts/material-placeholders.mjs writes the interim room crops.
export type MaterialName=keyof typeof manifest.materials;
export type MaterialState='pressed'|'selected'|'disabled';
type Insets={top:number;right:number;bottom:number;left:number};
type Entry={file:string;width:number;height:number;insets:Insets;fill:'stretch'|'repeat'|'round';states?:Partial<Record<MaterialState,string>>};

// Swap point: a kit file that keeps its name drops in with no code change; a renamed file is a one-line change here.
const files:Record<string,number>={
 'parchment-note.png':require('../assets/materials/parchment-note.png'),
 'oak-panel.png':require('../assets/materials/oak-panel.png'),
 'oak-panel-selected.png':require('../assets/materials/oak-panel-selected.png'),
 'wax-card.png':require('../assets/materials/wax-card.png'),
 'brass-plaque.png':require('../assets/materials/brass-plaque.png'),
 'brass-plaque-pressed.png':require('../assets/materials/brass-plaque-pressed.png'),
 'brass-plaque-disabled.png':require('../assets/materials/brass-plaque-disabled.png'),
 'engraved-button.png':require('../assets/materials/engraved-button.png'),
 'engraved-button-pressed.png':require('../assets/materials/engraved-button-pressed.png'),
 'engraved-button-disabled.png':require('../assets/materials/engraved-button-disabled.png'),
 'leather-strip.png':require('../assets/materials/leather-strip.png'),
 'leather-strip-selected.png':require('../assets/materials/leather-strip-selected.png'),
 'glass-input.png':require('../assets/materials/glass-input.png'),
};

export type Material={source:number;width:number;height:number;insets:Insets;fill:Entry['fill'];scale:number};
// A state without its own art falls back to the base material.
export function material(name:MaterialName,state?:MaterialState):Material{
 const entry=manifest.materials[name] as Entry,file=state&&entry.states?.[state]||entry.file;
 return {source:files[file],width:entry.width,height:entry.height,insets:entry.insets,fill:entry.fill,scale:manifest.scale};
}

export type Slice={dest:{left:number;top:number;width:number;height:number};image:{left:number;top:number;width:number;height:number}};
// 9-slice: corners keep their size (insets / scale, shrunk to fit a small box), edges stretch along one axis, the centre
// along both. Each slice is a clipped window onto the whole image, scaled so its source region fills the window.
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
