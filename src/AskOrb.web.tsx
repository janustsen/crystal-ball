import {useEffect,useRef,useState} from 'react';
import {askOrbAim,askOrbDecor} from './askOrbScene';
import {startWebGlass} from './glassWeb';

// The tab bar's live glass Ask orb (src/askOrb.ts) at size points; its aura spills past the slot. The fallback stands
// in until the glass draws, and for good if WebGL fails.
export function AskOrb({size,reduce,fallback}:{size:number;reduce:boolean;fallback:React.ReactNode}){
 const ref=useRef<HTMLCanvasElement>(null),motion=useRef({reduce}).current,[live,setLive]=useState(false);
 const scene=useRef<Awaited<ReturnType<typeof startWebGlass>>|null>(null);
 motion.reduce=reduce;
 useEffect(()=>{
  let on=true;
  startWebGlass(ref.current!,size*2,{motion,aim:()=>askOrbAim,decorate:askOrbDecor}).then(glass=>{
   if(!on){glass.stop();return}
   scene.current=glass;setLive(true);
  }).catch(error=>console.warn('ask orb',error));
  return()=>{on=false;scene.current?.stop();scene.current=null};
 },[size]);
 useEffect(()=>{scene.current?.resume()},[reduce]);
 return <div aria-hidden="true" data-testid="ask-orb" style={{position:'relative',width:size,height:size}}>
  {live?null:fallback}
  <canvas key={size} ref={ref} style={{position:'absolute',left:-size/2,top:-size/2,width:size*2,height:size*2,pointerEvents:'none',visibility:live?'visible':'hidden'}}/>
 </div>;
}
