import {useEffect,useRef} from 'react';
import {Asset} from 'expo-asset';

export function useDelight({enabled,revealId,listening=false}:{enabled:boolean;thinking:boolean;revealId?:string;listening?:boolean}){
 const hum=useRef<HTMLAudioElement|null>(null),chime=useRef<HTMLAudioElement|null>(null),seen=useRef<string|undefined>(undefined);
 useEffect(()=>{
  hum.current=new Audio(Asset.fromModule(require('../assets/audio/hum.wav')).uri);
  chime.current=new Audio(Asset.fromModule(require('../assets/audio/chime.wav')).uri);
  hum.current.loop=true;hum.current.volume=.18;chime.current.volume=.35;
  return()=>{hum.current?.pause();chime.current?.pause();};
 },[]);
 useEffect(()=>{
  const sync=()=>{
   if(enabled&&!listening&&document.visibilityState==='visible')void hum.current?.play().catch(()=>{});
   else {hum.current?.pause();chime.current?.pause();}
  };
  sync();document.addEventListener('pointerdown',sync);document.addEventListener('visibilitychange',sync);
  return()=>{document.removeEventListener('pointerdown',sync);document.removeEventListener('visibilitychange',sync);hum.current?.pause();chime.current?.pause();};
 },[enabled,listening]);
 useEffect(()=>{
  if(!revealId||seen.current===revealId)return;
  seen.current=revealId;
  if(enabled&&!listening&&document.visibilityState==='visible'&&chime.current){chime.current.currentTime=0;void chime.current.play().catch(()=>{});}
 },[revealId,enabled,listening]);
}
