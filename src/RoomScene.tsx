import {useEffect,useRef,useState} from 'react';
import {Animated,Image,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {GLView} from 'expo-gl';
import {OrbVisual} from './OrbVisual';
import {ballOnScreen,roomCover,stillFrame,type Spot} from './room';
import {ballArt,roomStills} from './roomAssets';
import {startNativeGlass} from './glassNative';
import type {BallStyle} from './types';
import type {Pointer} from './glassBall';

// The room ball's touch target hands its pointer to the live scene to spin it; a drag then suppresses the tap.
export type BallSpin={grab?:(e:Pointer)=>void;drag?:(e:Pointer)=>void;release?:(e:Pointer)=>void;dragged:boolean};

const spots:Spot[]=['Home','Sky','Ask','History','You','Library'];

// Native shows the room's stills (follow-up cb-native-room-video: expo-video flights cached with expo-file-system).
// A tab change cross-fades from the previous spot's still; the live glass ball (src/glassBall.ts) rests on the
// still's stand, and the static orb stands in until it starts, or for good if GL fails.
// ponytail: no depth-of-field blur on the ball (only You's still is out of focus); add a blur pass if it reads pasted.
export function RoomScene({spot,width,height,reduce,spin,ball='classic'}:{spot:Spot;width:number;height:number;reduce:boolean;spin:BallSpin;ball?:BallStyle}){
 const [previous,setPrevious]=useState<Spot|null>(null),shown=useRef(spot),fade=useRef(new Animated.Value(0)).current;
 const [failed,setFailed]=useState(false),[started,setStarted]=useState(0);
 const motion=useRef({reduce}).current,at=useRef(spot),scene=useRef<Awaited<ReturnType<typeof startNativeGlass>>|null>(null);
 motion.reduce=reduce;at.current=spot;
 useEffect(()=>{
  if(spot===shown.current)return;
  const from=shown.current;shown.current=spot;
  setPrevious(from);fade.setValue(1);
  Animated.timing(fade,{toValue:0,duration:450,useNativeDriver:true}).start(({finished})=>finished&&setPrevious(null));
 },[spot]);
 // A resize gets a fresh GL view (and context); the old scene stops with it.
 const generation=useRef(0),pending=useRef<AbortController|null>(null);
 useEffect(()=>{const mine=++generation.current;setStarted(0);return()=>{if(generation.current===mine)generation.current++;pending.current?.abort();scene.current?.stop();scene.current=null}},[width,height]);
 const start=(gl:Parameters<typeof startNativeGlass>[0])=>{
  const mine=generation.current;
  pending.current?.abort();
  const controller=new AbortController();pending.current=controller;
  setFailed(false);
  startNativeGlass(gl,{motion,signal:controller.signal,aim:()=>ballOnScreen(stillFrame(at.current),width,height)?.dir??null},spin).then(glass=>{
   if(!glass)return;
   if(controller.signal.aborted||mine!==generation.current){glass.stop();return}
   scene.current=glass;setStarted(n=>n+1);
  }).catch(error=>{if(mine===generation.current){setFailed(true);console.error('crystal ball scene',error)}});
 };
 useEffect(()=>{scene.current?.style(ball==='classic'?null:ballArt[ball])},[ball,started]);
 // Reduced motion runs no loop, so each new resting spot still gets one frame.
 useEffect(()=>{scene.current?.resume()},[reduce,spot]);
 const placed=ballOnScreen(stillFrame(spot),width,height),fill={position:'absolute' as const,left:0,top:0,width,height};
 // One canvas spans twice the widest still ball's diameter, so it is only ever scaled down.
 const S=Math.ceil(Math.max(...spots.map(s=>stillFrame(s)[2]))*roomCover(width,height).scale*4);
 return <View pointerEvents="none" style={{...fill,overflow:'hidden',backgroundColor:'#140E0A'}}>
  <Image source={roomStills[spot]} resizeMode="cover" style={fill}/>
  {previous?<Animated.Image source={roomStills[previous]} resizeMode="cover" style={{...fill,opacity:fade}}/>:null}
  <GLView key={`${width}x${height}`} onContextCreate={start} style={{position:'absolute',left:(placed?.x??0)-S/2,top:(placed?.y??0)-S/2,width:S,height:S,opacity:placed&&!failed&&started?1:0,transform:[{scale:placed?placed.r/(S/4):1}]}}/>
  {placed&&(failed||!started)?<View style={{position:'absolute',left:placed.x-placed.r,top:placed.y-placed.r,width:placed.r*2,height:placed.r*2,borderRadius:placed.r,overflow:'hidden'}}><OrbVisual size={placed.r*2} reduce ball={ball}/></View>:null}
  <LinearGradient colors={['rgba(20,14,10,.6)','rgba(20,14,10,0)']} style={{position:'absolute',left:0,top:0,width,height:150}}/>
  <LinearGradient colors={['rgba(20,14,10,0)','rgba(20,14,10,.6)','rgba(20,14,10,.94)']} locations={[0,.45,1]} style={{position:'absolute',left:0,bottom:0,width,height:320}}/>
 </View>;
}
