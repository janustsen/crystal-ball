import {serverRpcs} from './rpc.ts';
import {isHeardFrom} from '../src/heard-from.ts';
type Env=(key:string)=>string|undefined;

// Supabase holds the daily counts in production; without it (the loopback preview) they live in this process.
// ponytail: unauthenticated, so anyone can inflate a count; it is a rough campaign signal, never billing or identity.
export function heardFrom(env:Env){
 const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY'),local=new Map<string,number>();
 async function count(source:unknown){
  if(!isHeardFrom(source))throw new Error('Choose where you heard about Crystal Ball.');
  if(base&&key){
   const response=await fetch(`${base}/rest/v1/${serverRpcs.count_heard_from}`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({heard:source}),signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw new Error('Please try again later.');
   return;
  }
  const slot=`${new Date().toISOString().slice(0,10)} ${source}`;
  local.set(slot,(local.get(slot)??0)+1);
 }
 return {count,local};
}
