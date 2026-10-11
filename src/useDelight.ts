import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {setAudioModeAsync,useAudioPlayer} from 'expo-audio';
import {haptic} from './native';
import {motion} from './motion';

export function useDelight({enabled,thinking,revealId,listening=false}:{enabled:boolean;thinking:boolean;revealId?:string;listening?:boolean}){
 const hum=useAudioPlayer(require('../assets/audio/hum.wav'));
 const chime=useAudioPlayer(require('../assets/audio/chime.wav'));
 const [foreground,setForeground]=useState(AppState.currentState==='active');
 const [configured,setConfigured]=useState(false),[playbackRevision,setPlaybackRevision]=useState(0);
 const seen=useRef<string|undefined>(undefined);
 useEffect(()=>{
  const listener=AppState.addEventListener('change',state=>setForeground(state==='active'));
  return()=>listener.remove();
 },[]);
 useEffect(()=>{
  setConfigured(false);if(listening)return;
  let mounted=true;
  const timer=setTimeout(()=>{
   void setAudioModeAsync({playsInSilentMode:false,shouldPlayInBackground:false,interruptionMode:'mixWithOthers'}).then(()=>{if(mounted)setConfigured(true);}).catch(()=>{});
  },300);
  return()=>{mounted=false;clearTimeout(timer);};
 },[listening,playbackRevision]);
 const audible=enabled&&configured&&foreground&&!listening;
 useEffect(()=>{
  hum.loop=true;hum.volume=.18;chime.volume=.35;
  if(audible)hum.play();else {hum.pause();chime.pause();}
 },[audible,hum,chime]);
 useEffect(()=>{
  if(!thinking||!foreground)return;
  haptic('pulse');const timer=setInterval(()=>haptic('pulse'),motion.glow/2);
  return()=>clearInterval(timer);
 },[thinking,foreground]);
 useEffect(()=>{
  if(!revealId||seen.current===revealId)return;
  seen.current=revealId;
  if(foreground)haptic('success');
  let canceled=false;
  if(audible)void chime.seekTo(0).then(()=>{if(!canceled)chime.play();}).catch(()=>{});
  return()=>{canceled=true;};
 },[revealId,audible,foreground,chime]);
 return ()=>setPlaybackRevision(n=>n+1);
}
