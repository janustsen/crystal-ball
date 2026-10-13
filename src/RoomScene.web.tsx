import {useEffect,useRef,useState} from 'react';
import {Asset} from 'expo-asset';
import {OrbVisual} from './OrbVisual';
import {appCss} from './motionCss';
import type {BallSpin} from './RoomScene';
import {ballOnScreen,clipFrames,clipUrl,flightKey,roomCover,idleKey,maxBallRadius,roomAssetBase,roomFps,roomVersion,stillFrame,type BallFrame,type Spot} from './room';
import {ballArt,homeIdle,roomFlights,roomStills} from './roomAssets';
import {startWebGlass} from './glassWeb';
import type {BallStyle} from './types';



// Clips play from object URLs once fully loaded, so a cut never waits on the network. Streamed loops persist in
// the Cache API where the origin allows it (HTTPS or localhost) and in the HTTP cache elsewhere.
const clips=new Map<string,string>(),loading=new Map<string,Promise<void>>();
const listeners=new Set<()=>void>();
function loadClip(key:string,url:string,persist:boolean){
 let job=loading.get(key);
 if(!job){
  job=(async()=>{
   try{
    const cache=persist&&typeof caches!=='undefined'?await caches.open(`crystal-ball-room-${roomVersion}`).catch(()=>null):null;
    let response=await cache?.match(url);
    if(!response){
     response=await fetch(url);
     if(!response.ok)throw new Error(`${url}: ${response.status}`);
     await cache?.put(url,response.clone()).catch(()=>{});
    }
    clips.set(key,URL.createObjectURL(await response.blob()));
    listeners.forEach(listener=>listener());
   }catch(error){loading.delete(key);console.warn('room clip unavailable',error)}
  })();
  loading.set(key,job);
 }
 return job;
}
const spots:Spot[]=['Home','Sky','Ask','History','You'];
let prefetched=false;
// After the first screen settles, quietly load the bundled flights (from Home first, then the rest, then the Inner
// Library's push-in: only Home leads into it, and it has no loop or flight out), then any streamed loops.
function prefetchRoom(){
 if(prefetched)return;
 prefetched=true;
 void loadClip(idleKey('Home'),Asset.fromModule(homeIdle).uri,false);
 const flights=[...spots.slice(1).map(to=>flightKey('Home',to)),
  ...spots.slice(1).flatMap(from=>spots.filter(to=>to!==from).map(to=>flightKey(from,to))),flightKey('Home','Library')];
 setTimeout(async()=>{
  for(const key of flights)await loadClip(key,Asset.fromModule(roomFlights[key]).uri,false);
  if(roomAssetBase)for(const key of spots.slice(1).map(idleKey))await loadClip(key,clipUrl(key),true);
 },1500);
}

// The presented frame's media time (requestVideoFrameCallback where supported, so the ball lands on the exact frame).
function frameOf(video:HTMLVideoElement|null,frames:BallFrame[],loop:boolean){
 if(!video||video.readyState<2||!frames.length)return null;
 const time=Number(video.dataset.mediaTime??video.currentTime),i=Math.round(time*roomFps);
 return frames[loop?i%frames.length:Math.min(frames.length-1,i)];
}
function watchFrames(video:HTMLVideoElement|null){
 if(!video||!('requestVideoFrameCallback' in video))return;
 const next=(_:number,meta:{mediaTime:number})=>{video.dataset.mediaTime=String(meta.mediaTime);video.requestVideoFrameCallback(next)};
 video.requestVideoFrameCallback(next);
}

type Flight={key:string;url:string;to:Spot};
const fill={position:'absolute',left:0,top:0,width:'100%',height:'100%',objectFit:'cover',display:'block'} as const;

// The rendered room behind every tab: a tab change flies the camera to its spot (still → flight → loop cut
// pixel-exact), the live glass ball rides on top at each frame's tracked position, and reduced motion fades stills.
export function RoomScene({spot,width,height,reduce,spin,ball='classic',offset=0,zoom=1}:{spot:Spot;width:number;height:number;reduce:boolean;spin:BallSpin;ball?:BallStyle;offset?:number;zoom?:number;onPlaybackChange?:()=>void;onTravel?:(traveling:boolean)=>void}){
 const [at,setAt]=useState(spot),[flight,setFlight]=useState<Flight|null>(null),[fading,setFading]=useState<Spot|null>(null);
 const [,setLoaded]=useState(0),[ready,setReady]=useState(false);
 const ref=useRef<HTMLCanvasElement>(null),idle=useRef<HTMLVideoElement>(null),fly=useRef<HTMLVideoElement>(null);
 const motion=useRef({reduce}),scene=useRef<Awaited<ReturnType<typeof startWebGlass>>|null>(null),state=useRef({at,flight,width,height});
 motion.current.reduce=reduce;state.current={at,flight,width,height};
 useEffect(()=>{const update=()=>setLoaded(n=>n+1);listeners.add(update);prefetchRoom();return()=>{listeners.delete(update)}},[]);
 useEffect(()=>{
  const target=flight?.to??at;
  if(spot===target)return;
  // A flight needs its clip in hand and a resting start; otherwise cut (or fade, for reduced motion) to the still.
  const url=!flight&&!reduce&&ready?clips.get(flightKey(at,spot)):undefined;
  if(url){setFlight({key:flightKey(at,spot),url,to:spot});return}
  if(reduce&&ready)setFading(target);
  setFlight(null);setAt(spot);
 },[spot]);
 // Land on the destination when the clip ends, fails, or never starts (an autoplay block must not strand the camera).
 const land=(done:Flight)=>{if(state.current.flight===done){setAt(done.to);setFlight(null)}};
 useEffect(()=>{
  if(!flight)return;
  watchFrames(fly.current);
  fly.current?.play().catch(()=>land(flight));
  const timer=setTimeout(()=>land(flight),4000);
  return()=>clearTimeout(timer);
 },[flight]);
 // Switching to reduced motion mid-flight cuts straight to the destination rather than finishing the move.
 useEffect(()=>{if((reduce||!ready)&&flight)land(flight)},[reduce,ready]);
 // The ball canvas spans twice the ball's widest tracked diameter, so it is only ever scaled down.
 const S=Math.ceil(maxBallRadius*roomCover(width,height).scale*4);
 useEffect(()=>{
  if(!ref.current||!width||!height)return;
  setReady(false);
  const canvas=ref.current;
  let live=true;
  const controller=new AbortController();
  const aim=()=>{
   const {at,flight,width,height}=state.current;
   const frame=(flight?frameOf(fly.current,clipFrames(flight.key),false):frameOf(idle.current,clipFrames(idleKey(at)),true))??(flight?clipFrames(flight.key)[0]:stillFrame(at));
   const ball=ballOnScreen(frame,width,height);
   canvas.style.visibility=ball?'visible':'hidden';
   if(!ball)return null;
   const k=ball.r/(S/4);
   canvas.style.transform=`translate(${ball.x-S/2}px,${ball.y-S/2}px) scale(${k})`;
   // The render's depth of field and candle flicker, applied in the canvas's own (unscaled) pixels.
   canvas.style.filter=`blur(${(ball.blur/k).toFixed(2)}px) brightness(${(1+ball.flicker).toFixed(3)})`;
   return ball.dir;
  };
  // The live glass ball (src/glassBall.ts) draws alone on this canvas over the rendered room video. aim() runs before
  // every frame: it places the canvas and returns the camera's direction from the ball, or null while out of frame.
  startWebGlass(canvas,S,{motion:motion.current,aim,signal:controller.signal},spin).then(glass=>{
   if(!glass)return;
   if(!live){glass.stop();return}
   scene.current=glass;
   setReady(true);
  }).catch(error=>{if(live){setReady(false);console.error('crystal ball scene',error)}});
  return()=>{live=false;controller.abort();scene.current?.stop();scene.current=null};
 },[width,height]);
 useEffect(()=>{scene.current?.style(ball==='classic'?null:ballArt[ball])},[ball,ready]);
 useEffect(()=>{scene.current?.sharpen(zoom)},[zoom,ready]);
 // Reduced motion runs no loop, so each new resting spot or flight still gets one frame.
 useEffect(()=>{scene.current?.resume()},[reduce,at,flight]);
 const idleUrl=!reduce&&ready&&!flight?clips.get(idleKey(at)):undefined;
 useEffect(()=>watchFrames(idle.current),[idleUrl]);
 // The room replaces the fog Atmosphere, so it publishes the same shell reduced-motion flag.
 useEffect(()=>{const shell=ref.current?.closest('[data-testid="app-shell"]');shell?.setAttribute('data-reduced',String(reduce));return()=>shell?.removeAttribute('data-reduced')},[reduce]);
 // Home's short-screen offset (app/index.tsx) eases over the room's own 450 ms transition rather than snapping, on the Web
 // Animations API like the fade.
 const root=useRef<HTMLDivElement>(null),shifted=useRef(offset);
 useEffect(()=>{if(shifted.current===offset)return;root.current?.animate([{transform:`translateY(${shifted.current}px)`},{transform:`translateY(${offset}px)`}],{duration:450,easing:'ease-in-out'});shifted.current=offset},[offset]);
 const fallback=!ready?ballOnScreen(stillFrame(spot),width,height):null;
 // During a flight the destination still waits decoded behind the start still, so landing never flashes.
 const stills=!ready?[spot]:flight?[flight.to,at]:[at];
 return <div ref={root} aria-hidden="true" className="room" style={{position:'absolute',left:0,top:0,width,height,overflow:'hidden',pointerEvents:'none',background:'#140E0A',transform:`translateY(${offset}px)`}}>
  {stills.map(s=><img key={s} alt="" src={Asset.fromModule(roomStills[s]).uri} style={fill}/>)}
  {idleUrl?<video key={idleUrl} ref={idle} src={idleUrl} muted playsInline autoPlay loop style={fill}/>:null}
  {flight&&ready?<video key={flight.url} ref={fly} src={flight.url} muted playsInline autoPlay onEnded={()=>land(flight)} onError={()=>land(flight)} style={fill}/>:null}
  {/* Reduced motion's fade runs on the Web Animations API: the shell's reduced-motion rule stops CSS animations. */}
  {fading&&ready?<img key={`fade-${fading}`} alt="" data-room-fade src={Asset.fromModule(roomStills[fading]).uri} ref={img=>{if(img&&!img.getAnimations().length)img.animate([{opacity:1},{opacity:0}],{duration:450,easing:'ease-out',fill:'forwards'}).finished.then(()=>setFading(null),()=>setFading(null))}} style={fill}/>:null}
  {/* a resize gets a fresh canvas because stop() loses the old context */}
  <canvas key={`${width}x${height}`} ref={ref} width={S} height={S} style={{position:'absolute',left:0,top:0,width:S,height:S,transformOrigin:'50% 50%',visibility:'hidden'}}/>
  {fallback?<div style={{position:'absolute',left:fallback.x-fallback.r,top:fallback.y-fallback.r,width:fallback.r*2,height:fallback.r*2,borderRadius:'50%',overflow:'hidden'}}><OrbVisual size={fallback.r*2} reduce ball={ball}/></div>:null}
  {/* scrims: the header reads over the top, and the room fades into the ground under content and the tab bar */}
  <div style={{position:'absolute',left:0,top:0,width:'100%',height:150,background:'linear-gradient(180deg, rgba(20,14,10,.6) 0%, rgba(20,14,10,0) 100%)'}}/>
  <div style={{position:'absolute',left:0,bottom:0,width:'100%',height:320,background:'linear-gradient(180deg, rgba(20,14,10,0) 0%, rgba(20,14,10,.6) 45%, rgba(20,14,10,.94) 100%)'}}/>
  <style>{appCss}</style>
 </div>;
}
