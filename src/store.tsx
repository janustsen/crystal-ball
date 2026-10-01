import React,{createContext,useContext,useEffect,useState,useRef} from 'react';
import {Alert} from 'react-native';
import {forgetCheckIns} from './native';
import {forgetOmen} from './daily-omen';
import {updateOmenWidget} from './omen-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AccountState,Prediction,Facts} from './types';
import {mirror,restoreBackup,supabase} from './cloud';
let writes:Promise<void>=Promise.resolve();
const key='crystal-ball-v1';
const initial=():AccountState=>({facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,ambientSound:false,largeText:false});
const Context=createContext<{state:AccountState;ready:boolean;update:(fn:(s:AccountState)=>AccountState)=>void;savePrediction:(prediction:Prediction)=>void;remaining:number;reset:()=>Promise<void>;backup:(authenticate:()=>Promise<void>)=>Promise<void>;backupBusy:boolean}|null>(null);
export function Store({children}:React.PropsWithChildren){
 const [state,setState]=useState(initial),[ready,setReady]=useState(false),[backupBusy,setBackupBusy]=useState(false);
 const locked=useRef(false),cloudReady=useRef(false),current=useRef(state);current.current=state;
 useEffect(()=>{const timer=setInterval(()=>setState(s=>{const day=new Date().toISOString().slice(0,10);return s.usage.day===day?s:{...s,usage:{day,count:0}}}),60000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{void (async()=>{let loaded=initial();try{const raw=await AsyncStorage.getItem(key);if(raw){const s=JSON.parse(raw);if(s&&s.facts&&Array.isArray(s.history)&&Number.isFinite(s.credits))loaded={...loaded,...s};}try{loaded=await restoreBackup(loaded);cloudReady.current=true}catch{/* Do not overwrite an unread backup after an offline launch. */}setState(loaded)}finally{setReady(true)}})().catch(()=>{});},[]);
 useEffect(()=>{if(ready&&!locked.current){const snapshot=state;writes=writes.catch(()=>{}).then(async()=>{await AsyncStorage.setItem(key,JSON.stringify(snapshot));if(cloudReady.current)try{await mirror(snapshot)}catch{/* Keep local changes; retry on the next change. */}});}},[state,ready]);
 async function backup(authenticate:()=>Promise<void>){
  if(locked.current)throw new Error('Backup is already running.');
  const wasCloudReady=cloudReady.current;
  locked.current=true;setBackupBusy(true);cloudReady.current=false;
  try{await writes.catch(()=>{});
   const before=await supabase?.auth.getSession();
   if(before?.error)throw before.error;
   try{await authenticate()}catch(error){
    try{const after=await supabase?.auth.getSession();cloudReady.current=wasCloudReady&&!after?.error&&before?.data.session?.user.id===after?.data.session?.user.id}catch{}
    throw error;
   }
   const merged=await restoreBackup(current.current);await AsyncStorage.setItem(key,JSON.stringify(merged));setState(merged);await mirror(merged);cloudReady.current=true;}
  finally{locked.current=false;setBackupBusy(false)}
 }
 const day=new Date().toISOString().slice(0,10),used=state.usage.day===day?state.usage.count:0,daily=state.plus?10:1;
 return <Context.Provider value={{state,ready,backup,backupBusy,update:fn=>{if(!locked.current)setState(fn)},remaining:Math.max(0,daily-used)+state.credits,reset:async()=>{if(locked.current)return;await forgetOmen(AsyncStorage);void forgetCheckIns().catch(()=>Alert.alert('Notification cleanup failed','Old check-ins may still appear. Please try Forget everything again.'));updateOmenWidget(null);setState(s=>({...s,facts:{},history:[]}))},savePrediction:(prediction)=>setState(s=>{
  if(locked.current)return s;
  if(s.history.some(p=>p.id===prediction.id))return s;
  const count=s.usage.day===day?s.usage.count:0,allowance=s.plus?10:1;
  return {...s,history:[prediction,...s.history],usage:{day,count:count+1},credits:count>=allowance?Math.max(0,s.credits-1):s.credits};
 })}}>{children}</Context.Provider>;
}
export function useStore(){const value=useContext(Context);if(!value)throw new Error('Store unavailable');return value;}
export function learnedFacts(cards:{id:string;remember:boolean}[],answers:Facts):Facts{return Object.fromEntries(cards.filter(c=>c.remember&&answers[c.id]).map(c=>[c.id,answers[c.id]]));}
