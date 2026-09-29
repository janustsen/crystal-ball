import React,{createContext,useContext,useEffect,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AccountState,Prediction,Facts} from './types';
import {mirror} from './cloud';
let writes:Promise<void>=Promise.resolve();
const key='crystal-ball-v1';
const initial=():AccountState=>({facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,largeText:false});
const Context=createContext<{state:AccountState;ready:boolean;update:(fn:(s:AccountState)=>AccountState)=>void;savePrediction:(prediction:Prediction)=>void;remaining:number;reset:()=>void}|null>(null);
export function Store({children}:React.PropsWithChildren){
 const [state,setState]=useState(initial),[ready,setReady]=useState(false);
 useEffect(()=>{const timer=setInterval(()=>setState(s=>{const day=new Date().toISOString().slice(0,10);return s.usage.day===day?s:{...s,usage:{day,count:0}}}),60000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{AsyncStorage.getItem(key).then(raw=>{if(raw){const s=JSON.parse(raw);if(s&&s.facts&&Array.isArray(s.history)&&Number.isFinite(s.credits))setState({...initial(),...s});}}).catch(()=>{}).finally(()=>setReady(true));},[]);
 useEffect(()=>{if(ready){const snapshot=state;writes=writes.catch(()=>{}).then(async()=>{await AsyncStorage.setItem(key,JSON.stringify(snapshot));try{await mirror(snapshot)}catch{/* Local state remains authoritative; retry on the next change. */}});}},[state,ready]);
 const day=new Date().toISOString().slice(0,10),used=state.usage.day===day?state.usage.count:0,daily=state.plus?10:1;
 return <Context.Provider value={{state,ready,update:setState,remaining:Math.max(0,daily-used)+state.credits,reset:()=>setState(initial()),savePrediction:(prediction)=>setState(s=>{
  if(s.history.some(p=>p.id===prediction.id))return s;
  const count=s.usage.day===day?s.usage.count:0,allowance=s.plus?10:1;
  return {...s,history:[prediction,...s.history],usage:{day,count:count+1},credits:count>=allowance?Math.max(0,s.credits-1):s.credits};
 })}}>{children}</Context.Provider>;
}
export function useStore(){const value=useContext(Context);if(!value)throw new Error('Store unavailable');return value;}
export function learnedFacts(cards:{id:string;remember:boolean}[],answers:Facts):Facts{return Object.fromEntries(cards.filter(c=>c.remember&&answers[c.id]).map(c=>[c.id,answers[c.id]]));}
