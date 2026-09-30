import {useEffect,useRef,useState} from 'react';
import {AppState,Platform} from 'react-native';
import {setAudioModeAsync,useAudioPlayer} from 'expo-audio';
import {haptic} from './native';

export function useDelight({enabled,thinking,revealId,listening=false}:{enabled:boolean;thinking:boolean;revealId?:string;listening?:boolean}){
 const hum=useAudioPlayer(require('../assets/audio/hum.wav'));
 const chime=useAudioPlayer(require('../assets/audio/chime.wav'));
 const [foreground,setForeground]=useState(AppState.currentState==='active');
 const [configured,setConfigured]=useState(false);
 const seen=useRef<string|undefined>(undefined);
 useEffect(()=>{
  const listener=AppState.addEventListener('change',state=>setForeground(state==='active'));
  const visibility=()=>setForeground(document.visibilityState==='visible');
  if(Platform.OS==='web'){visibility();document.addEventListener('visibilitychange',visibility);}
  return()=>{listener.remove();if(Platform.OS==='web')document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{
  let mounted=true;
  void setAudioModeAsync({playsInSilentMode:false,shouldPlayInBackground:false,interruptionMode:'mixWithOthers'}).then(()=>{if(mounted)setConfigured(true);}).catch(()=>{});
  return()=>{mounted=false;};
 },[]);
 const audible=enabled&&configured&&foreground&&!listening;
 useEffect(()=>{
  hum.loop=true;hum.volume=.18;chime.volume=.35;
  if(audible)hum.play();else {hum.pause();chime.pause();}
  return()=>hum.pause();
 },[audible,hum,chime]);
 useEffect(()=>{
  if(!thinking||!foreground)return;
  haptic('pulse');const timer=setInterval(()=>haptic('pulse'),3200);
  return()=>clearInterval(timer);
 },[thinking,foreground]);
 useEffect(()=>{
  if(!revealId||seen.current===revealId)return;
  seen.current=revealId;
  if(foreground)haptic('success');
  if(audible)void chime.seekTo(0).then(()=>chime.play()).catch(()=>{});
 },[revealId,audible,foreground,chime]);
}
