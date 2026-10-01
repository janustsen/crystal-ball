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
const Context=createContext<{state:AccountState;ready:boolean;update:(fn:(s:AccountState)=>AccountState)=>void;savePrediction:(prediction:Prediction)=>void;remaining:number;reset:()=>void;forgetAll:()=>Promise<void>;backup:(mode:'save'|'restore',authenticate:()=>Promise<void>)=>Promise<void>;backupBusy:boolean}|null>(null);
export function Store({children}:React.PropsWithChildren){
 const [state,setState]=useState(initial),[ready,setReady]=useState(false),[backupBusy,setBackupBusy]=useState(false);
 const locked=useRef(true),current=useRef(state);
 const change=(fn:(s:AccountState)=>AccountState)=>{current.current=fn(current.current);setState(current.current)};
 useEffect(()=>{const timer=setInterval(()=>{if(!locked.current)change(s=>{const day=new Date().toISOString().slice(0,10);return s.usage.day===day?s:{...s,usage:{day,count:0}}})},60000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{void (async()=>{
  let loaded=initial();const raw=await AsyncStorage.getItem(key);
  if(raw){const s=JSON.parse(raw);if(!s||!s.facts||!Array.isArray(s.history)||!Number.isFinite(s.credits))throw new Error('Local archive is unreadable.');loaded={...loaded,...s}}
  change(()=>loaded);locked.current=false;setReady(true);
 })().catch(()=>{});},[]);
 useEffect(()=>{if(ready&&!locked.current){writes=writes.catch(()=>{}).then(async()=>{
  const snapshot=current.current;await AsyncStorage.setItem(key,JSON.stringify(snapshot));
  if(!locked.current&&snapshot.backupOwner)await mirror(snapshot);
 }).catch(()=>{});}},[state,ready]);
 async function backup(mode:'save'|'restore',authenticate:()=>Promise<void>){
  if(locked.current||!ready)throw new Error('Please wait for your archive.');
  locked.current=true;setBackupBusy(true);
  try{
   await writes.catch(()=>{});await authenticate();
   let next:AccountState;
   if(mode==='restore')next=await restoreBackup(current.current);
   else {
    const session=await supabase?.auth.getSession();
    if(session?.error)throw session.error;
    if(!session?.data.session||session.data.session.user.is_anonymous)throw new Error('Sign in with Apple to back up.');
    next={...current.current,backupOwner:session.data.session.user.id};
    await mirror(next);
   }
   await AsyncStorage.setItem(key,JSON.stringify(next));change(()=>next);
  }finally{locked.current=false;setBackupBusy(false)}
 }

 const day=new Date().toISOString().slice(0,10),used=state.usage.day===day?state.usage.count:0,daily=state.plus?10:1;
 return <Context.Provider value={{state,ready,backup,backupBusy:backupBusy||!ready,update:fn=>{if(!locked.current)change(fn)},remaining:Math.max(0,daily-used)+state.credits,reset:()=>{if(!locked.current)change(s=>({...initial(),backupOwner:s.backupOwner}))},forgetAll:async()=>{if(locked.current)return;await forgetOmen(AsyncStorage);void forgetCheckIns().catch(()=>Alert.alert('Notification cleanup failed','Old check-ins may still appear. Please try Forget everything again.'));updateOmenWidget(null);change(s=>({...s,facts:{},history:[]}))},savePrediction:(prediction)=>change(s=>{
  if(locked.current)return s;
  if(s.history.some(p=>p.id===prediction.id))return s;
  const count=s.usage.day===day?s.usage.count:0,allowance=s.plus?10:1;
  return {...s,history:[prediction,...s.history],usage:{day,count:count+1},credits:count>=allowance?Math.max(0,s.credits-1):s.credits};
 })}}>{children}</Context.Provider>;
}
export function useStore(){const value=useContext(Context);if(!value)throw new Error('Store unavailable');return value;}
export function learnedFacts(cards:{id:string;remember:boolean}[],answers:Facts):Facts{return Object.fromEntries(cards.filter(c=>c.remember&&answers[c.id]).map(c=>[c.id,answers[c.id]]));}
