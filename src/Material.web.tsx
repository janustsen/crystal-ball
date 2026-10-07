import React,{useContext,useLayoutEffect,useRef,useState} from 'react';
import {Asset} from 'expo-asset';
import {material,MaterialInk,type Material as Art,type MaterialName,type MaterialState} from './materials';
import {RoomLightContext,shade,exposureColor,castOffset,type Shade} from './lighting';

// The browser's own 9-slice: one stretched, filled border-image reaching past the surface by the kit's shadow margin.
export function borderImage(m:Art,uri:string){
 const {top,right,bottom,left}=m.insets,px=(n:number)=>`${n/m.scale}px`;
 return {borderStyle:'solid',borderWidth:0,borderImage:`url("${uri}") ${top} ${right} ${bottom} ${left} fill / ${px(top)} ${px(right)} ${px(bottom)} ${px(left)} / ${m.outset}px stretch`};
}
// The room's light on the art: a gradient from the key-facing edge to the far one, masked to the art's own shape.
export function lightLayer(m:Art,uri:string,light:Shade){
 const {top,right,bottom,left}=m.insets,px=(n:number)=>`${n/m.scale}px`,angle=Math.atan2(-light.dir[0],light.dir[1])*180/Math.PI;
 return {background:`linear-gradient(${angle.toFixed(1)}deg, ${exposureColor(light.near,light.color)}, ${exposureColor(light.far,light.color)})`,
  WebkitMaskBoxImage:`url("${uri}") ${top} ${right} ${bottom} ${left} / ${px(top)} ${px(right)} ${px(bottom)} ${px(left)} stretch`};
}

// The surface clips the art to itself, dropping the kit's baked studio shadow, and casts its own away from the spot's light.
export function Material({name,state,children}:React.PropsWithChildren<{name:MaterialName;state?:MaterialState}>){
 const m=material(name,state),room=useContext(RoomLightContext),ref=useRef<HTMLDivElement>(null),[light,setLight]=useState<Shade|null>(null);
 useLayoutEffect(()=>{
  const box=ref.current?.getBoundingClientRect();if(!room||!box)return;
  const next=shade(room,m,{x:box.left,y:box.top,width:box.width,height:box.height});
  setLight(old=>old&&JSON.stringify(old)===JSON.stringify(next)?old:next);
 });
 const uri=Asset.fromModule(m.source).uri,o=m.outset,dir=light?.dir??[0,-1],cast=castOffset(dir);
 return <>
  <div ref={ref} aria-hidden="true" data-testid={`material-${name}`} data-state={state} style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',
   filter:`drop-shadow(${cast.x.toFixed(1)}px ${cast.y.toFixed(1)}px 9px rgba(0,0,0,.55)) drop-shadow(0 1px 2px rgba(0,0,0,.45))`}}>
   <div style={{position:'absolute',inset:0,boxSizing:'border-box',...borderImage(m,uri)} as React.CSSProperties}/>
   {light?<div data-light style={{position:'absolute',inset:-o,...lightLayer(m,uri,light)} as React.CSSProperties}/>:null}
  </div>
  {children===undefined?null:<MaterialInk.Provider value={m.ink?{color:m.ink,finish:m.finish,dir}:undefined}>{children}</MaterialInk.Provider>}
  {m.caps.map((cap,i)=><img key={i} aria-hidden="true" alt="" src={Asset.fromModule(cap.source).uri} style={{position:'absolute',pointerEvents:'none',width:cap.width,height:cap.height,left:`calc(${cap.x*100}% + ${cap.offset[0]-cap.width/2}px)`,top:`calc(${cap.y*100}% + ${cap.offset[1]-cap.height/2}px)`,filter:`drop-shadow(${(cast.x/2).toFixed(1)}px ${(cast.y/2).toFixed(1)}px 4px rgba(0,0,0,.5))`}}/>)}
 </>;
}
