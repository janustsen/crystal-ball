import {createContext} from 'react';
import {roomCover,type Spot} from './room';
import {inkColor,type Material} from './materials';

// The room's light on the UI. Each spot's visible sources (candle, fire, skylight) in render pixels, with colour, falloff
// radius and gain, from the room-matched mockups of the UI integration eval (comp.py SPOTS). A material samples this
// light at its key-facing and far edges, so a panel near the candle is warm and bright and falls off away from it.
type Key={x:number;y:number;color:[number,number,number];radius:number;gain:number};
const candle=(x:number,y:number,radius:number,gain=1):Key=>({x,y,color:[1,.6,.3],radius,gain});
const skylight=(x:number,y:number,radius:number,gain:number):Key=>({x,y,color:[.45,.6,1],radius,gain});
const keys:Record<Spot,Key[]>={
 Home:[candle(370,1690,520),{x:1050,y:1770,color:[1,.5,.22],radius:600,gain:.8},skylight(585,300,700,.35)],
 Ask:[candle(178,1235,800)],
 History:[{x:-250,y:700,color:[1,.66,.36],radius:1100,gain:.7},skylight(585,0,900,.25)],
 Sky:[skylight(585,915,800,.55),candle(-200,2200,1100,.45)],
 You:[{x:1080,y:1300,color:[1,.55,.25],radius:800,gain:1}],
 // The Inner Library is shelf-lit like History's spot.
 Library:[{x:-250,y:700,color:[1,.66,.36],radius:1100,gain:.7}],
};
const ambient=.05,reference=.55;
const lum=([r,g,b]:number[])=>.2126*r+.7152*g+.0722*b;

// The shell the room fills, in window coordinates, and the spot on screen.
export type RoomLight={spot:Spot;x:number;y:number;width:number;height:number};
export const RoomLightContext=createContext<RoomLight|null>(null);

export type Light={exposure:number;color:[number,number,number];dir:[number,number]};
// Light at a window point: exposure relative to the room's reference level (1 = the kit as rendered), the light's
// colour, and the unit direction from the point toward the spot's main source.
export function lightAt(room:RoomLight,x:number,y:number):Light{
 const {scale,x:ox,y:oy}=roomCover(room.width,room.height),px=(x-room.x-ox)/scale,py=(y-room.y-oy)/scale;
 const sum=[ambient,ambient,ambient];
 for(const k of keys[room.spot]){const f=k.gain/(1+((px-k.x)**2+(py-k.y)**2)/k.radius**2);k.color.forEach((c,i)=>sum[i]+=f*c)}
 const peak=Math.max(...sum),main=keys[room.spot][0],dx=main.x-px,dy=main.y-py,d=Math.hypot(dx,dy)||1;
 return {exposure:lum(sum)/reference,color:sum.map(c=>c/peak) as [number,number,number],dir:[dx/d,dy/d]};
}

const linear=(hex:string)=>lum([1,3,5].map(i=>{const v=parseInt(hex.slice(i,i+2),16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}));
// How far the room may dim or brighten a material while its text keeps 4.5:1 against the material's body. Under light
// text the body's worst case sits between its median and its brightest 5% (their geometric mean); under dark ink it is
// the darkest 5%, since a light card's grain and rules run right beside the letters.
export function exposureRange(m:Material,text:string|undefined):[number,number]{
 if(!m.luminance||!text)return [.45,1.2];
 const t=linear(text),[p5,p50,p95]=m.luminance;
 return t>p50?[.45,Math.max(.45,Math.min(1.2,((t+.05)/4.5-.05)/Math.sqrt(p50*p95)))]:[Math.min(1.2,Math.max(.45,(4.5*(t+.05)-.05)/p5)),1.2];
}

// The lens vignette over the whole screen, UI included (RoomLens draws the same ellipse): the share of light it leaves.
export const vignetteStrength=.3;
export function vignette(room:RoomLight,x:number,y:number){
 const dx=(x-room.x-room.width/2)/(room.width*.75),dy=(y-room.y-room.height*.38)/(room.height*.6),r=Math.hypot(dx,dy);
 return 1-vignetteStrength*Math.min(1,Math.max(0,(r-.5)/.5));
}

export type Shade={near:number;far:number;color:[number,number,number];dir:[number,number]};
// A material's lighting across its box (window coordinates): exposure at the edge facing the main source and at the
// opposite edge, clamped to its contrast range. A focused field takes at least the full light, so its focus frame shows.
export function shade(room:RoomLight,m:Material,box:{x:number;y:number;width:number;height:number},focused=false):Shade{
 const centre=lightAt(room,box.x+box.width/2,box.y+box.height/2),[dx,dy]=centre.dir,reach=(Math.abs(dx)*box.width+Math.abs(dy)*box.height)/2;
 // The contrast range holds for what reaches the eye: the room's exposure after the lens vignette.
 const [range,hi]=exposureRange(m,inkColor(m)),lo=focused?Math.max(1,range):range;
 const at=(s:number)=>{const x=box.x+box.width/2+dx*reach*s,y=box.y+box.height/2+dy*reach*s,v=vignette(room,x,y);return Math.min(hi,Math.max(lo,lightAt(room,x,y).exposure*v))/v};
 return {near:at(1),far:at(-1),color:centre.color,dir:centre.dir};
}
// The overlay that applies an exposure: darkening toward black below 1, warming toward the light's colour above it.
export function exposureTint(e:number,color:[number,number,number]):{rgb:[number,number,number];alpha:number}{
 return e<1?{rgb:[0,0,0],alpha:1-e}:{rgb:color.map(c=>Math.round(c*255)) as [number,number,number],alpha:Math.min(.5,e-1)};
}
export function exposureColor(e:number,color:[number,number,number]){
 const {rgb,alpha}=exposureTint(e,color);return `rgba(${rgb.join(',')},${alpha.toFixed(3)})`;
}
// Exposure at a point of the box, from its key-facing edge (near) to the opposite one (far); x, y relative to the centre.
export function exposureAt(light:Shade,x:number,y:number,width:number,height:number){
 const reach=(Math.abs(light.dir[0])*width+Math.abs(light.dir[1])*height)/2||1,t=Math.max(-1,Math.min(1,(x*light.dir[0]+y*light.dir[1])/reach));
 return light.far+(light.near-light.far)*(t+1)/2;
}
// The cast shadow falls away from the spot's main source; a tight contact shadow sits under every edge.
export const castOffset=(dir:[number,number])=>({x:-dir[0]*8,y:-dir[1]*8+5});
