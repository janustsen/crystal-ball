// Copy to app/room-verification.tsx only while running the room component browser drive.
// Ask hides the app's tabs, so this harness exposes every ordered pair without changing product navigation.
import React,{useRef,useState} from 'react';
import {Pressable,Text,View,useWindowDimensions} from 'react-native';
import {RoomScene} from '../src/RoomScene';
import type {Spot} from '../src/room';

export default function RoomPreview(){
 const [spot,setSpot]=useState<Spot>('Home'),spin=useRef({dragged:false}),{width,height}=useWindowDimensions();
 return <View style={{flex:1}}>
  <RoomScene spot={spot} width={width} height={height} reduce={false} spin={spin.current}/>
  <View style={{flexDirection:'row'}}>{(['Home','Sky','Ask','History','You'] as const).map(to=><Pressable key={to} testID={`spot-${to}`} onPress={()=>setSpot(to)} style={{padding:12,backgroundColor:'white'}}><Text>{to}</Text></Pressable>)}</View>
 </View>;
}
