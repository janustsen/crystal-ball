import {BillingError} from './billing.ts';
import {sha256,validProof,webReadingUsed,webReadingsResting,type WebReading} from '../src/web-reading.ts';
type Env=(key:string)=>string|undefined;
type Claim={browser:string;network:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const utcDay=(offset=0)=>new Date(Date.now()-offset*86400000).toISOString().slice(0,10);

// Sealed-link browser visitors get one free reading: one per browser, one per network per UTC day, a global daily cap.
// Supabase holds the claims in production; without it (the loopback preview) they live in this process.
export function webReadings(env:Env){
 const cap=Number(env('WEB_READING_DAILY_CAP')||500),base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');
 const salt=env('WEB_READING_SALT')||key||'local-preview';
 const browsers=new Map<string,string>(),networks=new Map<string,string>();
 async function rpc(name:string,args:object){
  const response=await fetch(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key!,authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('Web readings are unavailable right now. Please try again later.');
  return response.json().catch(()=>null);
 }
 async function claim(request:Request,proof:unknown):Promise<Claim>{
  const p=proof as WebReading;
  if(!p||typeof p!=='object'||typeof p.browser!=='string'||!uuid.test(p.browser)||![utcDay(),utcDay(1)].includes(p.day)||typeof p.nonce!=='string'||p.nonce.length>16||!validProof(p))throw new BillingError('Please reload the page and try again.',400);
  // ponytail: first X-Forwarded-For entry is the client IP on Supabase; a spoofed header still meets the browser check and global cap.
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
  const claimed={browser:p.browser.toLowerCase(),network:sha256(`${salt}:${ip}`)},today=utcDay();
  let outcome:unknown;
  if(base&&key)outcome=await rpc('claim_web_reading',{browser:claimed.browser,network:claimed.network,daily_cap:cap});
  else{
   outcome=browsers.has(claimed.browser)?'browser':networks.get(claimed.network)===today?'network':[...browsers.values()].filter(day=>day===today).length>=cap?'cap':'ok';
   if(outcome==='ok'){browsers.set(claimed.browser,today);networks.set(claimed.network,today)}
  }
  if(outcome==='cap')throw new BillingError(webReadingsResting,429);
  if(outcome!=='ok')throw new BillingError(webReadingUsed,429);
  return claimed;
 }
 // A failed forecast gives the visitor their reading back.
 async function release(claimed:Claim){
  if(base&&key){await rpc('release_web_reading',claimed).catch(()=>{});return}
  browsers.delete(claimed.browser);networks.delete(claimed.network);
 }
 return {claim,release};
}
