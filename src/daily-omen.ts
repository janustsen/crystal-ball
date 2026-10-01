import type {Facts} from './types';
import {localDay} from './retention';

export type Omen = {day:string;text:string|null};
export const omenKey='crystal-ball-personal-omen-v1';
let pending:Promise<Omen>|undefined;
let generation=0;
export function invalidateOmen(){generation++;pending=undefined;}
export async function forgetOmen(storage:{getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<void>}){
 invalidateOmen();
 const raw=await storage.getItem(omenKey);
 if(raw){const cached=JSON.parse(raw);await storage.setItem(omenKey,JSON.stringify({day:cached.day,text:null}));}
}
export function loadDailyOmen(storage:{getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<void>},facts:Facts,generate:(facts:Facts)=>Promise<string>,now=new Date()):Promise<Omen>{
 if(pending)return pending;
 const day=localDay(now),version=generation;
 const work=(async()=>{
  const raw=await storage.getItem(omenKey);
  if(raw){try{const cached=JSON.parse(raw);if(cached.day===day&&(cached.text===null||typeof cached.text==='string'))return cached as Omen;}catch{/* Replace an unreadable cache before requesting a new omen. */}}
  const omen:Omen={day,text:null};
  if(version!==generation)return omen;
  // Claim the day durably before inference: reloads and failures must not spend a second request.
  await storage.setItem(omenKey,JSON.stringify(omen));
  try{omen.text=await generate(facts)}catch{return omen;}
  if(version!==generation)return {day,text:null};
  await storage.setItem(omenKey,JSON.stringify(omen));return omen;
 })();
 pending=work;
 void work.finally(()=>{if(pending===work)pending=undefined}).catch(()=>{});
 return work;
}
