import {useEffect,useRef,useState} from 'react';
import {Animated,Easing,Image,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {GLView} from 'expo-gl';
import {useVideoPlayer,VideoView} from 'expo-video';
import {OrbVisual} from './OrbVisual';
import {ballOnScreen,clipFrames,flightKey,maxBallRadius,roomCover,roomFps,stillFrame,type Spot} from './room';
import {ballArt,roomFlights,roomStills} from './roomAssets';
import {startNativeGlass} from './glassNative';
import {applyAudioMode} from './useDelight';
import type {BallStyle} from './types';
import type {Pointer} from './glassBall';

// The room ball's touch target hands its pointer to the live scene to spin it; a drag then suppresses the tap.
export type BallSpin={grab?:(e:Pointer)=>void;drag?:(e:Pointer)=>void;release?:(e:Pointer)=>void;dragged:boolean};

// start is when the clip began playing (0 until then), so the ball's view follows the same frame as the video.
type Flight={key:string;to:Spot;start:number};

// The rendered room behind every tab: a tab change flies the camera to its spot (still → bundled flight → still,
// cut pixel-exact) while the ball rides each frame's tracked position on the native driver, then the live glass ball
// (src/glassBall.ts) rests on the stand. Reduced motion, or a change mid-flight, cross-fades the stills instead. The
// static orb stands in until the glass starts, or for good if GL fails. Native plays no loops: each spot rests on its still.
// ponytail: the static orb rides the flight because the iOS Simulator drops the GL ball over a playing video; try the
// glass in flight again once a device shows it composites.
// ponytail: no depth-of-field blur on the ball (only You's still is out of focus); add a blur pass if it reads pasted.
export function RoomScene({spot,width,height,reduce,spin,ball='classic'}:{spot:Spot;width:number;height:number;reduce:boolean;spin:BallSpin;ball?:BallStyle}){
 const [at,setAt]=useState(spot),[flight,setFlight]=useState<Flight|null>(null),[flying,setFlying]=useState(false);
 const [previous,setPrevious]=useState<Spot|null>(null),fade=useRef(new Animated.Value(0)).current,along=useRef(new Animated.Value(0)).current;
 const [failed,setFailed]=useState(false),[started,setStarted]=useState(0);
 const motion=useRef({reduce}).current,room=useRef({at,flight:null as Flight|null}).current,scene=useRef<Awaited<ReturnType<typeof startNativeGlass>>|null>(null);
 motion.reduce=reduce;room.at=at;
 const player=useVideoPlayer(null,p=>{p.muted=true;p.audioMixingMode='mixWithOthers'});
 const land=(done:Flight)=>{
  if(room.flight!==done)return;
  room.flight=null;along.stopAnimation();
  setAt(done.to);setFlight(null);setFlying(false);
 };
 useEffect(()=>{
  const target=room.flight?.to??room.at;
  if(spot===target)return;
  const key=flightKey(room.at,spot),clip=roomFlights[key];
  if(!room.flight&&!reduce&&clip){
   const next:Flight={key,to:spot,start:0};
   room.flight=next;setFlight(next);
   player.replaceAsync(clip).then(()=>{if(room.flight===next)player.play()},()=>land(next));
   return;
  }
  setPrevious(target);fade.setValue(1);
  Animated.timing(fade,{toValue:0,duration:450,useNativeDriver:true}).start(({finished})=>finished&&setPrevious(null));
  if(room.flight){player.pause();room.flight=null}
  setFlight(null);setFlying(false);setAt(spot);
 },[spot]);
 useEffect(()=>{
  const subs=[
   // replaceAsync resolves before the clip is ready, so a play() can start and stall at once: play again when ready.
   player.addListener('statusChange',({status})=>{if(status==='readyToPlay'&&room.flight&&!room.flight.start)player.play()}),
   player.addListener('playingChange',({isPlaying})=>{
    // expo-video sets the shared audio session to playback (ignoring the silent switch) as it starts and stops, so the
    // app's own sound mode is re-applied after it. ponytail: timed to land after expo-video's async session write.
    setTimeout(()=>void applyAudioMode().catch(()=>{}),300);
    const current=room.flight;
    if(!current)return;
    // A stall mid-flight shows the start still again and restarts the ride when playback resumes.
    if(!isPlaying){if(current.start){current.start=0;along.stopAnimation();setFlying(false)}return}
    if(current.start)return;
    const frames=clipFrames(current.key).length;
    current.start=Date.now();along.setValue(0);setFlying(true);
    Animated.timing(along,{toValue:frames-1,duration:(frames-1)/roomFps*1000,easing:Easing.linear,useNativeDriver:true}).start();
   }),
   player.addListener('playToEnd',()=>{if(room.flight)land(room.flight)}),
  ];
  return()=>subs.forEach(sub=>sub.remove());
 },[player]);
 // Land when a clip never starts or never ends, so a stalled player cannot strand the camera.
 useEffect(()=>{
  if(!flight)return;
  const timer=setTimeout(()=>land(flight),4000);
  return()=>clearTimeout(timer);
 },[flight]);
 // Switching to reduced motion mid-flight cuts straight to the destination rather than finishing the move.
 useEffect(()=>{if(reduce&&room.flight){player.pause();land(room.flight)}},[reduce]);
 // The frame the camera is on: the flight's tracked frame by elapsed time, else the resting still.
 const frameNow=()=>{
  const current=room.flight;
  if(!current?.start)return stillFrame(room.at);
  const frames=clipFrames(current.key);
  return frames[Math.min(frames.length-1,Math.round((Date.now()-current.start)*roomFps/1000))];
 };
 // A resize gets a fresh GL view (and context); the old scene stops with it.
 const generation=useRef(0),pending=useRef<AbortController|null>(null);
 useEffect(()=>{const mine=++generation.current;setStarted(0);return()=>{if(generation.current===mine)generation.current++;pending.current?.abort();scene.current?.stop();scene.current=null}},[width,height]);
 const start=(gl:Parameters<typeof startNativeGlass>[0])=>{
  const mine=generation.current;
  pending.current?.abort();
  const controller=new AbortController();pending.current=controller;
  setFailed(false);
  startNativeGlass(gl,{motion,signal:controller.signal,aim:()=>ballOnScreen(frameNow(),width,height)?.dir??null},spin).then(glass=>{
   if(!glass)return;
   if(controller.signal.aborted||mine!==generation.current){glass.stop();return}
   scene.current=glass;setStarted(n=>n+1);
  }).catch(error=>{if(mine===generation.current){setFailed(true);console.error('crystal ball scene',error)}});
 };
 useEffect(()=>{scene.current?.style(ball==='classic'?null:ballArt[ball])},[ball,started]);
 // Reduced motion runs no loop, so each new resting spot or flight still gets one frame.
 useEffect(()=>{scene.current?.resume()},[reduce,at,flying]);
 const placed=ballOnScreen(stillFrame(at),width,height),fill={position:'absolute' as const,left:0,top:0,width,height};
 // One canvas spans twice the ball's widest tracked diameter, so it is only ever scaled down.
 const S=Math.ceil(maxBallRadius*roomCover(width,height).scale*4);
 const pose=(b:ReturnType<typeof ballOnScreen>)=>b?[b.x-S/2,b.y-S/2,b.r/(S/4),1]:[0,0,0,0];
 const poses=flight&&flying?clipFrames(flight.key).map(f=>pose(ballOnScreen(f,width,height))):null;
 const track=(k:number)=>poses?along.interpolate({inputRange:poses.map((_,i)=>i),outputRange:poses.map(p=>p[k])}):pose(placed)[k];
 const carry={opacity:track(3),transform:[{translateX:track(0)},{translateY:track(1)},{scale:track(2)}]};
 return <View pointerEvents="none" style={{...fill,overflow:'hidden',backgroundColor:'#140E0A'}}>
  {/* During a flight the destination still waits decoded beneath the start still, so landing never flashes. */}
  <Image source={roomStills[flight?.to??at]} resizeMode="cover" style={fill}/>
  {flight&&!flying?<Image source={roomStills[at]} resizeMode="cover" style={fill}/>:null}
  <VideoView player={player} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} style={{...fill,backgroundColor:'transparent',opacity:flying?1:0}}/>
  {previous?<Animated.Image source={roomStills[previous]} resizeMode="cover" style={{...fill,opacity:fade}}/>:null}
  <Animated.View style={{position:'absolute',left:0,top:0,width:S,height:S,...carry}}>
   <GLView key={`${width}x${height}`} onContextCreate={start} style={{width:S,height:S,opacity:!failed&&started&&!flying?1:0}}/>
   {flying?<View style={{position:'absolute',left:S/4,top:S/4,width:S/2,height:S/2,borderRadius:S/4,overflow:'hidden'}}><OrbVisual size={S/2} reduce ball={ball}/></View>:null}
  </Animated.View>
  {placed&&!flight&&(failed||!started)?<View style={{position:'absolute',left:placed.x-placed.r,top:placed.y-placed.r,width:placed.r*2,height:placed.r*2,borderRadius:placed.r,overflow:'hidden'}}><OrbVisual size={placed.r*2} reduce ball={ball}/></View>:null}
  <LinearGradient colors={['rgba(20,14,10,.6)','rgba(20,14,10,0)']} style={{position:'absolute',left:0,top:0,width,height:150}}/>
  <LinearGradient colors={['rgba(20,14,10,0)','rgba(20,14,10,.6)','rgba(20,14,10,.94)']} locations={[0,.45,1]} style={{position:'absolute',left:0,bottom:0,width,height:320}}/>
 </View>;
}
