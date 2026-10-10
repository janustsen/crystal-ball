import type {Facts} from './types';
import {currentOmen,localDay} from './retention';
import {updateOmenWidget} from './omen-widget';

// whisper: the day's one-day forecast, generated in the same request as the omen.
export type Omen = {day:string;text:string|null;whisper?:string|null;tries?:number};
export type OmenReply = {text:string;whisper:string};
export const omenKey='crystal-ball-personal-omen-v1';
// Bound app requests after failure or interruption; each request can also use the provider’s one repair.
export const omenTries=2;
let pending:Promise<Omen>|undefined;
let generation=0;
let storageWork:Promise<unknown>=Promise.resolve();
function serialize<T>(operation:()=>Promise<T>):Promise<T>{
 const work=storageWork.then(operation);
 storageWork=work.catch(()=>{});
 return work;
}
export function invalidateOmen(){generation++;pending=undefined;}
export async function forgetOmen(storage:{getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<void>}){
 invalidateOmen();
 await serialize(async()=>{
  const raw=await storage.getItem(omenKey);
  if(raw){const cached=JSON.parse(raw);await storage.setItem(omenKey,JSON.stringify({day:cached.day,text:null,whisper:null,tries:omenTries}));}
 });
}
export function loadDailyOmen(storage:{getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<void>},facts:Facts,generate:(facts:Facts)=>Promise<OmenReply>,now:()=>Date=()=>new Date(),publish:(omen:Omen|null)=>void=updateOmenWidget):Promise<Omen>{
 if(pending)return pending;
 const day=localDay(now()),version=generation;
 const work=(async()=>{
  const omen:Omen={day,text:null,whisper:null,tries:1};
  const cached=await serialize(async()=>{
   const raw=await storage.getItem(omenKey);
   if(version!==generation)return omen;
   if(raw){try{const value=JSON.parse(raw);if(value.day===day&&(value.text===null||typeof value.text==='string')){
    // A claim without a recorded try count predates retries and counts as one try.
    const tries=Number.isInteger(value.tries)?value.tries:1;
    if(typeof value.text==='string'||tries>=omenTries)return {...value,tries} as Omen;
    omen.tries=tries+1;
   }}catch{/* Replace an unreadable cache before requesting a new omen. */}}
   // Claim the try durably before inference: reloads and failures must not spend more than the bounded tries.
   await storage.setItem(omenKey,JSON.stringify(omen));
  });
  if(version!==generation)return omen;
  if(cached)return cached;
  try{const reply=await generate(facts);omen.text=reply.text;omen.whisper=reply.whisper;}catch{return omen;}
  await serialize(async()=>{
   if(version===generation)await storage.setItem(omenKey,JSON.stringify(omen));
  });
  return version===generation?omen:{day,text:null};
 })().then(omen=>{
  const today=localDay(now()),fresh=currentOmen(omen,today);
  if(version===generation)publish(fresh);
  return fresh??{day:today,text:null};
 });
 pending=work;
 void work.finally(()=>{if(pending===work)pending=undefined}).catch(()=>{});
 return work;
}
