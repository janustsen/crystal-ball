import {useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {GLView} from 'expo-gl';
import {askOrbAim,askOrbDecor} from './askOrbScene';
import {startNativeGlass} from './glassNative';

// The tab bar's live glass Ask orb (src/askOrbScene.ts) at size points; its aura spills past the slot. The fallback stays
// beneath the glass, which covers it exactly, so the orb still shows wherever GL draws nothing.
export function AskOrb({size,reduce,fallback}:{size:number;reduce:boolean;fallback:React.ReactNode}){
 const motion=useRef({reduce}).current,[live,setLive]=useState(false);
 const scene=useRef<Awaited<ReturnType<typeof startNativeGlass>>|null>(null),mounted=useRef(true),pending=useRef<AbortController|null>(null);
 motion.reduce=reduce;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;pending.current?.abort();scene.current?.stop();scene.current=null}},[]);
 useEffect(()=>{scene.current?.resume()},[reduce]);
 return <View pointerEvents="none" style={{width:size,height:size}}>
  {fallback}
  <GLView onContextCreate={gl=>{
   pending.current?.abort();
   const controller=new AbortController();pending.current=controller;
   return startNativeGlass(gl,{motion,signal:controller.signal,aim:()=>askOrbAim,decorate:askOrbDecor}).then(glass=>{
   if(!glass)return;
   if(controller.signal.aborted||!mounted.current){glass.stop();return}
   scene.current=glass;setLive(true);
  }).catch(error=>console.warn('ask orb',error))}} style={{position:'absolute',left:-size/2,top:-size/2,width:size*2,height:size*2,opacity:live?1:0}}/>
 </View>;
}
