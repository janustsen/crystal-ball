import React from 'react';
import {Asset} from 'expo-asset';
import {material,type Material as Art,type MaterialName,type MaterialState} from './materials';

// The browser's own 9-slice: one border-image (stretch, repeat or round, as the material asks) filling the surface.
export function borderImage(m:Art,uri:string){
 const {top,right,bottom,left}=m.insets,px=(n:number)=>`${n/m.scale}px`;
 return {borderStyle:'solid',borderWidth:0,borderImage:`url("${uri}") ${top} ${right} ${bottom} ${left} fill / ${px(top)} ${px(right)} ${px(bottom)} ${px(left)} / 0 ${m.fill}`};
}

export function Material({name,state}:{name:MaterialName;state?:MaterialState}){
 const m=material(name,state);
 return <div aria-hidden="true" data-testid={`material-${name}`} data-state={state} style={{position:'absolute',inset:0,pointerEvents:'none',boxSizing:'border-box',...borderImage(m,Asset.fromModule(m.source).uri)} as React.CSSProperties}/>;
}
