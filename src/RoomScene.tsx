import {useEffect,useRef,useState} from 'react';
import {Animated,Image,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {SvgXml} from 'react-native-svg';
import {OrbVisual} from './OrbVisual';
import {ballOnScreen,stillFrame,type Spot} from './room';
import {roomStills} from './roomAssets';

// Home's ball hands its pointer-down to the web scene to spin it; a drag then suppresses the reading tap.
export type BallSpin={grab?:(e:PointerEvent)=>void;dragged:boolean};

// Native shows the room's stills (follow-up cb-native-room-video: expo-video flights cached with expo-file-system).
// A tab change cuts to its spot, or fades for reduced motion; the ball is the static orb in the ring stand.
export function RoomScene({spot,width,height,reduce}:{spot:Spot;width:number;height:number;reduce:boolean;spin:BallSpin}){
 const [previous,setPrevious]=useState<Spot|null>(null),shown=useRef(spot),fade=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  if(spot===shown.current)return;
  const from=shown.current;shown.current=spot;
  if(!reduce)return;
  setPrevious(from);fade.setValue(1);
  Animated.timing(fade,{toValue:0,duration:450,useNativeDriver:true}).start(()=>setPrevious(null));
 },[spot]);
 const ball=ballOnScreen(stillFrame(spot),width,height),fill={position:'absolute' as const,left:0,top:0,width,height};
 return <View pointerEvents="none" style={{...fill,overflow:'hidden',backgroundColor:'#050302'}}>
  <Image source={roomStills[spot]} resizeMode="cover" style={fill}/>
  {previous?<Animated.Image source={roomStills[previous]} resizeMode="cover" style={{...fill,opacity:fade}}/>:null}
  {ball?<View style={{position:'absolute',left:ball.x-ball.r,top:ball.y-ball.r,width:ball.r*2,height:ball.r*2,borderRadius:ball.r,overflow:'hidden'}}><OrbVisual size={ball.r*2} reduce={reduce}/></View>:null}
  <LinearGradient colors={['rgba(5,3,2,.75)','rgba(5,3,2,0)']} style={{position:'absolute',left:0,top:0,width,height:130}}/>
  <LinearGradient colors={['rgba(5,3,2,0)','rgba(5,3,2,.55)','rgba(5,3,2,.9)']} locations={[0,.45,1]} style={{position:'absolute',left:0,bottom:0,width,height:304}}/>
 </View>;
}

const orb='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26"><defs><radialGradient id="b" cx="50%" cy="60%" r="70.7%"><stop offset="0" stop-color="#f0b066"/><stop offset=".45" stop-color="#8a4a22"/><stop offset=".85" stop-color="#1e110a"/></radialGradient><radialGradient id="h" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff6e2" stop-opacity=".95"/><stop offset=".18" stop-color="#fff6e2" stop-opacity="0"/></radialGradient></defs><circle cx="13" cy="13" r="13" fill="url(#b)"/><circle cx="13" cy="13" r="13" fill="url(#h)"/></svg>';
export function AskOrb(_:{reduce:boolean}){
 return <View style={{width:26,height:26,borderRadius:13,boxShadow:'0 0 14px rgba(255,170,90,.45)'}}><SvgXml xml={orb} width={26} height={26}/></View>;
}
