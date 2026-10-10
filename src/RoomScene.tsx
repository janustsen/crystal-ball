import {useEffect,useRef,useState} from 'react';
import {Animated,Image,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {OrbVisual} from './OrbVisual';
import {ballOnScreen,stillFrame,type Spot} from './room';
import {roomStills} from './roomAssets';
import type {BallStyle} from './types';
import type {Pointer} from './glassBall';

// The room ball's touch target hands its pointer to the live scene to spin it; a drag then suppresses the tap.
export type BallSpin={grab?:(e:Pointer)=>void;drag?:(e:Pointer)=>void;release?:(e:Pointer)=>void;dragged:boolean};

// Native shows the room's stills (follow-up cb-native-room-video: expo-video flights cached with expo-file-system).
// A tab change cuts to its spot, or fades for reduced motion; the ball is the static orb in the ring stand.
export function RoomScene({spot,width,height,reduce,ball='classic'}:{spot:Spot;width:number;height:number;reduce:boolean;spin:BallSpin;ball?:BallStyle}){
 const [previous,setPrevious]=useState<Spot|null>(null),shown=useRef(spot),fade=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(spot===shown.current)return;
  const from=shown.current;shown.current=spot;
  if(!reduce)return;
  setPrevious(from);fade.setValue(1);
  Animated.timing(fade,{toValue:0,duration:450,useNativeDriver:true}).start(()=>setPrevious(null));
 },[spot]);
 const placed=ballOnScreen(stillFrame(spot),width,height),fill={position:'absolute' as const,left:0,top:0,width,height};
 return <View pointerEvents="none" style={{...fill,overflow:'hidden',backgroundColor:'#140E0A'}}>
  <Image source={roomStills[spot]} resizeMode="cover" style={fill}/>
  {previous?<Animated.Image source={roomStills[previous]} resizeMode="cover" style={{...fill,opacity:fade}}/>:null}
  {placed?<View style={{position:'absolute',left:placed.x-placed.r,top:placed.y-placed.r,width:placed.r*2,height:placed.r*2,borderRadius:placed.r,overflow:'hidden'}}><OrbVisual size={placed.r*2} reduce={reduce} ball={ball}/></View>:null}
  <LinearGradient colors={['rgba(20,14,10,.6)','rgba(20,14,10,0)']} style={{position:'absolute',left:0,top:0,width,height:150}}/>
  <LinearGradient colors={['rgba(20,14,10,0)','rgba(20,14,10,.6)','rgba(20,14,10,.94)']} locations={[0,.45,1]} style={{position:'absolute',left:0,bottom:0,width,height:320}}/>
 </View>;
}
