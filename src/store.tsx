import React,{createContext,useContext,useEffect,useState,useRef} from 'react';
import {saveReading,saveCircleReading,withBalance} from './reading-history';
import {publishCircleForecast,type CircleForecast} from './social';
import {loadBalance,serverMetered} from './api';
import type {Balance} from './billing';
import {Alert} from 'react-native';
import {forgetCheckIns,reopenCheckIn,cancelCheckIn} from './native';
import {forgetOmen} from './daily-omen';
import {updateOmenWidget} from './omen-widget';
import {restoreProfile,canRead,updateBirthday} from './profile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AccountState,Prediction,Facts} from './types';
import {mirror,restoreBackup,supabase} from './cloud';
let writes:Promise<void>=Promise.resolve(),uploads:Promise<void>=Promise.resolve();
const key='crystal-ball-v1';
const initial=():AccountState=>({sunSign:null,ageBand:null,facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,ambientSound:false,largeText:false});
const Context=createContext<{state:AccountState;ready:boolean;hydrationError:string|null;retryHydration:()=>void;update:(fn:(s:AccountState)=>AccountState)=>void;savePrediction:(prediction:Prediction,facts?:Facts,balance?:Balance)=>Promise<void>;publishCircle:(draft:string)=>Promise<CircleForecast>;applyBalance:(balance:Balance)=>void;remaining:number;reset:()=>void;forgetAll:()=>Promise<void>;backup:(mode:'save'|'restore',authenticate:()=>Promise<void>)=>Promise<void>;backupBusy:boolean}|null>(null);
export function Store({children}:React.PropsWithChildren){
 const [state,setState]=useState(initial),[ready,setReady]=useState(false),[backupBusy,setBackupBusy]=useState(false);
 const [hydrationError,setHydrationError]=useState<string|null>(null),[hydrationAttempt,setHydrationAttempt]=useState(0);
 const locked=useRef(true),current=useRef(state),accountVersion=useRef(0);
 const version=accountVersion.current;
 const archiveWork=useRef<Promise<unknown>>(Promise.resolve());
 const change=(fn:(s:AccountState)=>AccountState)=>{current.current=fn(current.current);setState(current.current)};
 function withArchiveLock<T>(action:()=>Promise<T>){
  locked.current=true;setBackupBusy(true);
  const work=archiveWork.current.catch(()=>{}).then(action);
  archiveWork.current=work;
  return work.finally(()=>{if(archiveWork.current===work){locked.current=false;setBackupBusy(false)}});
 }
 useEffect(()=>{const timer=setInterval(()=>{if(!locked.current)change(s=>{const day=new Date().toISOString().slice(0,10);return s.usage.day===day?s:{...s,usage:{day,count:0}}})},60000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{
  let active=true;
  const timer=setTimeout(()=>{active=false;setHydrationError('Opening your saved readings timed out. Your archive has not been changed.')},10000);
  void (async()=>{
   let loaded=initial();const raw=await AsyncStorage.getItem(key);
   if(raw!==null){const s=JSON.parse(raw);if(!s||!s.facts||!Array.isArray(s.history)||!Number.isFinite(s.credits))throw new Error('Local archive is unreadable.');loaded=restoreProfile({...initial(),...s})}
   if(!active)return;
   clearTimeout(timer);
   if(serverMetered){
    try{loaded=withBalance(loaded,await loadBalance())}catch{console.warn('Reading balance unavailable; showing the last saved balance.')}
   }
   if(active){change(()=>loaded);locked.current=false;setReady(true)}
  })().catch(()=>{if(active)setHydrationError('Could not open your saved readings. Your archive has not been changed.')}).finally(()=>clearTimeout(timer));
  return()=>{active=false;clearTimeout(timer)};
 },[hydrationAttempt]);
 useEffect(()=>{if(ready&&!locked.current){writes=writes.catch(()=>{}).then(async()=>{
  const snapshot=current.current;await AsyncStorage.setItem(key,JSON.stringify(snapshot));
  uploads=uploads.catch(()=>{}).then(async()=>{
   const latest=current.current;
   if(!locked.current&&latest.backupOwner&&canRead(latest))await mirror(latest);
  }).catch(()=>console.warn('Automatic backup failed; it will retry on the next update.'));
 }).catch(()=>console.warn('Automatic archive persistence failed; it will retry on the next update.'));}},[state,ready,backupBusy]);
 useEffect(()=>{if(ready)for(const reading of state.history)if(reading.outcome)void cancelCheckIn(reading.id).catch(()=>Alert.alert('Reminder cleanup failed','Your answer is saved, but its reminder could not be canceled. Please try checking in again.'));else reopenCheckIn(reading.id);},[ready,state.history]);
 async function backup(mode:'save'|'restore',authenticate:()=>Promise<void>){
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});await uploads.catch(()=>{});
   accountVersion.current++;
   try{await authenticate()}finally{
    if(serverMetered){
     change(s=>withBalance(s,{plus:false,plusUntil:null,packs:0,used:0,day:new Date().toISOString().slice(0,10)}));
     const balance=await loadBalance();change(s=>withBalance(s,balance));
    }
   }
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
  });
 }
 async function forgetAll(){
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});await uploads.catch(()=>{});await forgetOmen(AsyncStorage);
   void forgetCheckIns().catch(()=>Alert.alert('Notification cleanup failed','Old check-ins may still appear. Please try Forget everything again.'));
   updateOmenWidget(null);change(s=>updateBirthday({...s,facts:{},history:[]}));
   await AsyncStorage.setItem(key,JSON.stringify(current.current));
   if(current.current.backupOwner&&canRead(current.current))await mirror(current.current);
  });
 }

 function applyBalance(balance:Balance){if(version===accountVersion.current&&!locked.current)change(s=>withBalance(s,balance))}
 async function savePrediction(prediction:Prediction,facts:Facts={},balance?:Balance){
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});
   if(version!==accountVersion.current)throw new Error('Your account changed. Please ask again.');
   const saved=saveReading(current.current,prediction);
   const next={...(balance?withBalance(saved,balance):saved),facts:{...saved.facts,...facts}};
   await AsyncStorage.setItem(key,JSON.stringify(next));change(()=>next);
  });
 }

 async function publishCircle(draft:string):Promise<CircleForecast>{
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});
   const forecast=await publishCircleForecast(draft);
   const balance=serverMetered?await loadBalance().catch(()=>null):null;
   const saved=saveCircleReading(current.current,forecast),next=balance?withBalance(saved,balance):saved;
   await AsyncStorage.setItem(key,JSON.stringify(next));change(()=>next);
   return forecast;
  });
 }

 const day=new Date().toISOString().slice(0,10),used=state.usage.day===day?state.usage.count:0,daily=state.plus?10:1;
 return <Context.Provider value={{state,ready,hydrationError,publishCircle,applyBalance,retryHydration:()=>{if(hydrationError){setHydrationError(null);setHydrationAttempt(n=>n+1)}},backup,backupBusy:backupBusy||!ready,update:fn=>{if(!locked.current)change(fn)},remaining:Math.max(0,daily-used)+state.credits,reset:()=>{if(!locked.current)change(s=>({...initial(),backupOwner:s.backupOwner}))},forgetAll,savePrediction}}>{children}</Context.Provider>;
}
export function useStore(){const value=useContext(Context);if(!value)throw new Error('Store unavailable');return value;}
export function learnedFacts(cards:{id:string;remember:boolean}[],answers:Facts):Facts{return Object.fromEntries(cards.filter(c=>c.remember&&answers[c.id]).map(c=>[c.id,answers[c.id]]));}
