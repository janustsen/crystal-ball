import React,{createContext,useContext,useEffect,useState,useRef} from 'react';
import {saveReading,saveCircleReading,withBalance,localStarter} from './reading-history';
import {publishCircleForecast,type CircleForecast} from './social';
import {loadBalance,saveStyles,serverMetered} from './api';
import {freeLeft,type Balance} from './billing';
import {Alert} from 'react-native';
import {forgetCheckIns} from './native';
import {forgetOmen} from './daily-omen';
import {updateOmenWidget} from './omen-widget';
import {restoreProfile,canRead,updateBirthday} from './profile';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AccountState,Prediction,Facts,StyleOf} from './types';
import {mirror,restoreBackup,supabase,anonymousOwner} from './cloud';
let writes:Promise<void>=Promise.resolve(),uploads:Promise<void>=Promise.resolve();
const key='crystal-ball-v1',deletionKey='crystal-ball-deletion-pending';
const initial=():AccountState=>({sunSign:null,ageBand:null,ladder:{asked:0,opened:[]},facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,ambientSound:false});
const Context=createContext<{state:AccountState;ready:boolean;hydrationError:string|null;retryHydration:()=>void;update:(fn:(s:AccountState)=>AccountState)=>void;savePrediction:(prediction:Prediction,facts?:Facts,balance?:Balance|null)=>Promise<void>;publishCircle:(draft:string)=>Promise<CircleForecast>;applyBalance:(balance:Balance)=>Promise<void>;saveAskProgress:(fn:(s:AccountState)=>AccountState,balance?:Balance)=>Promise<void>;chooseStyle:<K extends keyof StyleOf>(kind:K,value:StyleOf[K])=>Promise<void>;remaining:number;starter:number;reset:()=>void;forgetAll:()=>Promise<void>;backup:(mode:'save'|'restore',authenticate:()=>Promise<void>)=>Promise<void>;backupBusy:boolean;deleteAccount:(remove:()=>Promise<void>)=>Promise<void>}|null>(null);
export function Store({children}:React.PropsWithChildren){
 const [state,setState]=useState(initial),[ready,setReady]=useState(false),[backupBusy,setBackupBusy]=useState(false);
 const [accountReset,setAccountReset]=useState(0);
 const [hydrationError,setHydrationError]=useState<string|null>(null),[hydrationAttempt,setHydrationAttempt]=useState(0);
 const locked=useRef(true),current=useRef(state),accountVersion=useRef(0),deletionPending=useRef(false);
 const version=accountVersion.current;
 const archiveWork=useRef<Promise<unknown>>(Promise.resolve());
 const serverClock=useRef<{offset:number;asOf:number;at:number}|null>(null);
 const change=(fn:(s:AccountState)=>AccountState)=>{current.current=fn(current.current);setState(current.current)};
 async function balanced(state:AccountState,balance:Balance){
  const owner=await anonymousOwner(),previous=state.balanceSnapshot;
  if(balance.owner!==owner||(previous?.owner===owner&&balance.asOf<=previous.asOf))return state;
  serverClock.current={offset:Date.parse(balance.asOf)-Date.now(),asOf:Date.parse(balance.asOf),at:performance.now()};
  return withBalance(state,balance);
 }
 function withArchiveLock<T>(action:()=>Promise<T>){
  locked.current=true;setBackupBusy(true);
  const work=archiveWork.current.catch(()=>{}).then(action);
  archiveWork.current=work;
  return work.finally(()=>{if(archiveWork.current===work){locked.current=deletionPending.current;setBackupBusy(false)}});
 }
 // Server-metered days belong to the server: the last balance anchors two estimates of its clock, and either one passing midnight refreshes.
 // The wall-clock offset survives device sleep; the monotonic one survives a phone clock changed afterwards. Each refresh re-anchors both.
 useEffect(()=>{const timer=setInterval(()=>{if(serverMetered){const c=serverClock.current,estimates=c?[Date.now()+c.offset,c.asOf+performance.now()-c.at]:[Date.now()];if(ready&&estimates.some(ms=>new Date(ms).toISOString().slice(0,10)>current.current.usage.day))void loadBalance().then(applyBalance).catch(()=>{});return}const day=new Date().toISOString().slice(0,10);if(!locked.current)change(s=>s.usage.day===day?s:{...s,usage:{day,count:0}})},60000);return()=>clearInterval(timer)},[ready]);
 useEffect(()=>{
  let active=true;
  const timer=setTimeout(()=>{active=false;setHydrationError('Opening your saved readings timed out. Your archive has not been changed.')},10000);
  void (async()=>{
   const deleting=await AsyncStorage.getItem(deletionKey);
   if(!active)return;
   if(deleting!==null){
    clearTimeout(timer);deletionPending.current=true;
    await withArchiveLock(cleanupDeletedAccount);
    return;
   }
   let loaded=initial();const raw=await AsyncStorage.getItem(key);
   if(raw!==null){const s=JSON.parse(raw);if(!s||!s.facts||!Array.isArray(s.history)||!Number.isFinite(s.credits))throw new Error('Local archive is unreadable.');loaded=restoreProfile({...initial(),...s})}
   if(!active)return;
   clearTimeout(timer);
   if(serverMetered){
    try{loaded=await balanced(loaded,await loadBalance())}catch{console.warn('Reading balance unavailable; showing the last saved balance.')}
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
 async function backup(mode:'save'|'restore',authenticate:()=>Promise<void>){
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});await uploads.catch(()=>{});
   accountVersion.current++;
   change(s=>({...s,chartWeather:undefined}));
   try{await authenticate()}finally{
    if(serverMetered){
     const owner=await anonymousOwner();
     if(current.current.balanceSnapshot?.owner!==owner)change(s=>({...s,balanceSnapshot:undefined,yearAhead:undefined,plus:false,credits:0,starter:undefined,usage:{day:new Date().toISOString().slice(0,10),count:0}}));
     const next=await balanced(current.current,await loadBalance());change(()=>next);
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
 async function cleanupDeletedAccount(){
  setHydrationError(null);
  const results=await Promise.allSettled([
   AsyncStorage.setItem(key,JSON.stringify(current.current)),
   forgetOmen(AsyncStorage),
   forgetCheckIns(),
   Promise.resolve().then(()=>updateOmenWidget(null)),
  ]);
  try{
   if(results.some(result=>result.status==='rejected'))throw new Error('Local cleanup incomplete');
   await AsyncStorage.removeItem(deletionKey);
  }catch{
   setHydrationError('Your account was deleted, but this device could not finish clearing saved data and reminders. Try again to finish local cleanup.');
   return;
  }
  deletionPending.current=false;setReady(true);
 }
 async function deleteAccount(remove:()=>Promise<void>){
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});await uploads.catch(()=>{});
   accountVersion.current++;
   await AsyncStorage.setItem(deletionKey,'1');
   try{await remove()}catch(error){await AsyncStorage.removeItem(deletionKey);throw error}
   deletionPending.current=true;setReady(false);serverClock.current=null;
   change(initial);setAccountReset(n=>n+1);
   await cleanupDeletedAccount();
  });
 }
 async function forgetAll(){
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});await uploads.catch(()=>{});
   accountVersion.current++;
   await forgetOmen(AsyncStorage);
   void forgetCheckIns().catch(()=>Alert.alert('Notification cleanup failed','Old check-ins may still appear. Please try Forget everything again.'));
   // The Ball asks progress restarts, but granted bonuses stay counted so re-answering never earns them twice.
   updateOmenWidget(null);change(s=>updateBirthday({...s,facts:{},history:[],whispers:[],yearAhead:s.yearAhead?{kind:'owned',source:s.yearAhead.source}:undefined,...(s.asks?{asks:{seen:[],skipped:[],insights:[],bonus:s.asks.bonus}}:{})}));
   await AsyncStorage.setItem(key,JSON.stringify(current.current));
   if(current.current.backupOwner&&canRead(current.current))await mirror(current.current);
  });
 }

 async function chooseStyle<K extends keyof StyleOf>(kind:K,value:StyleOf[K]){
  if(!ready)throw new Error('Please wait for your archive.');
  if(locked.current)return;
  const field=kind==='ball'?'ballStyle':'cardStyle';
  if(!serverMetered){change(s=>({...s,[field]:value}));return}
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});
   if(version!==accountVersion.current)throw new Error('Your account changed. Please choose again.');
   const latest=await loadBalance();
   const balance=await saveStyles(kind==='ball'?value as StyleOf['ball']:latest.ballStyle??'classic',kind==='card'?value as StyleOf['card']:latest.cardStyle??'classic');
   const next=await balanced(current.current,balance);
   await AsyncStorage.setItem(key,JSON.stringify(next));change(()=>next);
  });
 }

 async function applyBalance(balance:Balance){
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});
   const next=await balanced(current.current,balance);
   await AsyncStorage.setItem(key,JSON.stringify(next));change(()=>next);
  });
 }
 async function saveAskProgress(fn:(s:AccountState)=>AccountState,balance?:Balance){
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});
   if(version!==accountVersion.current)throw new Error('Your account changed. Please try again.');
   const next=fn(balance?await balanced(current.current,balance):current.current);
   await AsyncStorage.setItem(key,JSON.stringify(next));change(()=>next);
  });
 }
 async function savePrediction(prediction:Prediction,facts:Facts={},balance?:Balance|null){
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});
   if(version!==accountVersion.current)throw new Error('Your account changed. Please ask again.');
   const saved=saveReading(current.current,prediction,undefined,balance!==null);
   const next={...(balance?await balanced({...saved,plus:current.current.plus,credits:current.current.credits,usage:current.current.usage},balance):saved),facts:{...saved.facts,...facts}};
   await AsyncStorage.setItem(key,JSON.stringify(next));change(()=>next);
  });
 }

 async function publishCircle(draft:string):Promise<CircleForecast>{
  if(!ready)throw new Error('Please wait for your archive.');
  return withArchiveLock(async()=>{
   await writes.catch(()=>{});
   const forecast=await publishCircleForecast(draft);
   const balance=serverMetered?await loadBalance().catch(()=>null):null;
   const saved=saveCircleReading(current.current,forecast),next=balance?await balanced(saved,balance):saved;
   await AsyncStorage.setItem(key,JSON.stringify(next));change(()=>next);
   return forecast;
  });
 }

 const day=new Date().toISOString().slice(0,10),used=serverMetered||state.usage.day===day?state.usage.count:0,starter=serverMetered?state.starter??0:localStarter(state);
 return <Context.Provider key={accountReset} value={{state,ready,hydrationError,publishCircle,applyBalance,saveAskProgress,chooseStyle,retryHydration:()=>{if(hydrationError){if(deletionPending.current){void withArchiveLock(cleanupDeletedAccount);return}setHydrationError(null);setHydrationAttempt(n=>n+1)}},backup,deleteAccount,backupBusy:backupBusy||!ready,update:fn=>{if(!locked.current&&version===accountVersion.current)change(fn)},remaining:freeLeft({plus:state.plus,starter,used})+state.credits,starter,reset:()=>{if(!locked.current)change(s=>({...initial(),backupOwner:s.backupOwner}))},forgetAll,savePrediction}}>{children}</Context.Provider>;
}
export function useStore(){const value=useContext(Context);if(!value)throw new Error('Store unavailable');return value;}
export function learnedFacts(cards:{id:string;remember:boolean}[],answers:Facts):Facts{return Object.fromEntries(cards.filter(c=>c.remember&&answers[c.id]).map(c=>[c.id,answers[c.id]]));}
