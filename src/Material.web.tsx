import React from 'react';
import {Asset} from 'expo-asset';
import {material,MaterialInk,type Material as Art,type MaterialName,type MaterialState} from './materials';

// The browser's own 9-slice: one stretched, filled border-image reaching past the surface by the shadow outset.
export function borderImage(m:Art,uri:string){
 const {top,right,bottom,left}=m.insets,px=(n:number)=>`${n/m.scale}px`;
 return {borderStyle:'solid',borderWidth:0,borderImage:`url("${uri}") ${top} ${right} ${bottom} ${left} fill / ${px(top)} ${px(right)} ${px(bottom)} ${px(left)} / ${m.outset}px stretch`};
}

export function Material({name,state,children}:React.PropsWithChildren<{name:MaterialName;state?:MaterialState}>){
 const m=material(name,state);
 return <>
  <div aria-hidden="true" data-testid={`material-${name}`} data-state={state} style={{position:'absolute',inset:0,pointerEvents:'none',boxSizing:'border-box',...borderImage(m,Asset.fromModule(m.source).uri)} as React.CSSProperties}/>
  {children===undefined?null:<MaterialInk.Provider value={m.ink}>{children}</MaterialInk.Provider>}
  {m.caps.map((cap,i)=><img key={i} aria-hidden="true" alt="" src={Asset.fromModule(cap.source).uri} style={{position:'absolute',pointerEvents:'none',width:cap.width,height:cap.height,left:`calc(${cap.x*100}% + ${cap.offset[0]-cap.width/2}px)`,top:`calc(${cap.y*100}% + ${cap.offset[1]-cap.height/2}px)`}}/>)}
 </>;
}
