import React,{useContext,useRef,useState} from 'react';
import {Image,View} from 'react-native';
import {material,slices,capBox,MaterialInk,type MaterialName,type MaterialState} from './materials';
import {RoomLightContext,shade,exposureAt,exposureTint,castOffset,type Shade} from './lighting';

// A surface's rendered material: put it first inside the surface (which keeps its own layout, padding, accessibility and
// testID) and the surface's content inside it, so text takes the material's ink. The surface clips the art to itself,
// dropping the kit's baked studio shadow, and casts its own away from the spot's light. Native draws the 9 slices as
// clipped images, each with the room's light at its centre as a tinted copy, and the caps over the edges.
// ponytail: the light is sampled once per slice and the cast shadow is iOS-only (Android needs a backed view for it).
export function Material({name,state,children}:React.PropsWithChildren<{name:MaterialName;state?:MaterialState}>){
 const m=material(name,state),room=useContext(RoomLightContext),ref=useRef<View>(null),o=m.outset;
 const [size,setSize]=useState<{width:number;height:number}|null>(null),[light,setLight]=useState<Shade|null>(null);
 const dir=light?.dir??[0,-1],cast=castOffset(dir);
 function layout(width:number,height:number){
  setSize({width,height});
  if(room)ref.current?.measureInWindow((x,y,w,h)=>setLight(shade(room,m,{x,y,width:w,height:h})));
 }
 const art=size?slices(m,size.width+2*o,size.height+2*o).map((s,i)=>{
  const e=light?exposureAt(light,s.dest.left+s.dest.width/2-o-size.width/2,s.dest.top+s.dest.height/2-o-size.height/2,size.width,size.height):1,tint=light?exposureTint(e,light.color):null;
  return <View key={i} style={{position:'absolute',overflow:'hidden',...s.dest,left:s.dest.left-o,top:s.dest.top-o}}>
   <Image source={m.source} resizeMode="stretch" style={{position:'absolute',...s.image}}/>
   {tint&&tint.alpha>.01?<Image source={m.source} resizeMode="stretch" tintColor={`rgb(${tint.rgb.join(',')})`} style={{position:'absolute',...s.image,opacity:tint.alpha}}/>:null}
  </View>;
 }):null;
 return <>
  <View ref={ref} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" testID={`material-${name}`} onLayout={e=>layout(e.nativeEvent.layout.width,e.nativeEvent.layout.height)}
   style={{position:'absolute',left:0,top:0,right:0,bottom:0,shadowColor:'#000',shadowOpacity:.55,shadowRadius:9,shadowOffset:{width:cast.x,height:cast.y}}}>
   <View style={{position:'absolute',left:0,top:0,right:0,bottom:0,overflow:'hidden'}}>{art}</View>
  </View>
  {children===undefined?null:<MaterialInk.Provider value={m.ink?{color:m.ink,finish:m.finish,dir}:undefined}>{children}</MaterialInk.Provider>}
  {size?m.caps.map((cap,i)=><View key={i} pointerEvents="none" accessible={false} style={{position:'absolute',...capBox(cap,size.width,size.height)}}><Image source={cap.source} style={{width:'100%',height:'100%'}}/></View>):null}
 </>;
}
