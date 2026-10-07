import React,{useState} from 'react';
import {Image,View} from 'react-native';
import {material,slices,capBox,MaterialInk,type MaterialName,type MaterialState} from './materials';

// A surface's rendered material: put it first inside the surface (which keeps its own layout, padding, accessibility and
// testID) and the surface's content inside it, so text takes the material's ink. The art reaches past the surface by
// its shadow outset. Native draws the 9 slices as clipped images under the content, and the caps over its edges.
export function Material({name,state,children}:React.PropsWithChildren<{name:MaterialName;state?:MaterialState}>){
 const [size,setSize]=useState<{width:number;height:number}|null>(null),m=material(name,state),o=m.outset;
 return <>
  <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" testID={`material-${name}`} onLayout={e=>setSize(e.nativeEvent.layout)} style={{position:'absolute',left:-o,top:-o,right:-o,bottom:-o}}>
   {size?slices(m,size.width,size.height).map((s,i)=><View key={i} style={{position:'absolute',overflow:'hidden',...s.dest}}><Image source={m.source} resizeMode="stretch" style={{position:'absolute',...s.image}}/></View>):null}
  </View>
  {children===undefined?null:<MaterialInk.Provider value={m.ink}>{children}</MaterialInk.Provider>}
  {size?m.caps.map((cap,i)=><View key={i} pointerEvents="none" accessible={false} style={{position:'absolute',...capBox(cap,size.width-2*o,size.height-2*o)}}><Image source={cap.source} style={{width:'100%',height:'100%'}}/></View>):null}
 </>;
}
