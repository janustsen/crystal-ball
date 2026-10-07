import React,{useState} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import {material,slices,type MaterialName,type MaterialState} from './materials';

// A surface's rendered material, stretched behind its live content: put it first inside the surface, which keeps its own
// layout, padding, accessibility and testID. Native draws the 9 slices as clipped images.
// ponytail: native always stretches; a kit material that must tile ("repeat"/"round") needs pre-cut edge tiles here.
export function Material({name,state}:{name:MaterialName;state?:MaterialState}){
 const [size,setSize]=useState<{width:number;height:number}|null>(null),m=material(name,state);
 return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" testID={`material-${name}`} onLayout={e=>setSize(e.nativeEvent.layout)} style={StyleSheet.absoluteFill}>
  {size?slices(m,size.width,size.height).map((s,i)=><View key={i} style={{position:'absolute',overflow:'hidden',...s.dest}}><Image source={m.source} resizeMode="stretch" style={{position:'absolute',...s.image}}/></View>):null}
 </View>;
}
