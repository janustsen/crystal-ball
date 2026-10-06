import {serverRpcs,type ServerRpc} from './rpc.ts';
import {BillingError} from './billing.ts';
import {sha256,validProof,webReadingUsed,webNetworkUsed,webReadingsResting,type WebReading} from '../src/web-reading.ts';
type Env=(key:string)=>string|undefined;
type Claim={browser:string;network:string;day:string;expires_at:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const utcDay=(offset=0)=>new Date(Date.now()-offset*86400000).toISOString().slice(0,10);

// Sealed-link browser visitors get one free reading: one per browser, one per network per UTC day, a global daily cap.
// Supabase holds the claims in production; without it (the loopback preview) they live in this process.
export function webReadings(env:Env){
 const cap=Number(env('WEB_READING_DAILY_CAP')||500),base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');
 const salt=env('WEB_READING_SALT')||key||'local-preview';
 type Reservation={day:string;expires_at:string;completed:boolean};
 const browsers=new Map<string,Reservation>(),networks=new Map<string,Reservation>();
 async function rpc(name:ServerRpc,args:object){
  const response=await fetch(`${base}/rest/v1/${serverRpcs[name]}`,{method:'POST',headers:{apikey:key!,authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new Error('Web readings are unavailable right now. Please try again later.');
  return response.json().catch(()=>null);
 }
 async function claim(request:Request,proof:unknown):Promise<Claim>{
  const p=proof as WebReading;
  if(!p||typeof p!=='object'||typeof p.browser!=='string'||!uuid.test(p.browser)||![utcDay(),utcDay(1)].includes(p.day)||typeof p.nonce!=='string'||p.nonce.length>16||!validProof(p))throw new BillingError('Please reload the page and try again.',400);
  // ponytail: first X-Forwarded-For entry is the client IP on Supabase; a spoofed header still meets the browser check and global cap.
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
  const today=utcDay(),claimed={browser:p.browser.toLowerCase(),network:sha256(`${salt}:${ip}`),day:today,expires_at:new Date(Date.now()+600_000).toISOString()};
  let outcome:unknown;
  if(base&&key){const result=await rpc('claim_web_reading',{browser:claimed.browser,network:claimed.network,daily_cap:cap});outcome=result.outcome;claimed.day=result.day;claimed.expires_at=result.expires_at;}
  else{
   for(const entries of [browsers,networks])for(const [key,value] of entries)if(!value.completed&&Date.parse(value.expires_at)<=Date.now())entries.delete(key);
   outcome=browsers.has(claimed.browser)?'browser':networks.get(claimed.network)?.day===today?'network':[...browsers.values()].filter(value=>value.day===today).length>=cap?'cap':'ok';
   if(outcome==='ok'){const value={day:today,expires_at:claimed.expires_at,completed:false};browsers.set(claimed.browser,value);networks.set(claimed.network,{...value})}
  }
  if(outcome==='cap')throw new BillingError(webReadingsResting,429);
  if(outcome==='network')throw new BillingError(webNetworkUsed,429);
  if(outcome!=='ok')throw new BillingError(webReadingUsed,429);
  return claimed;
 }
 async function complete(claimed:Claim){
  if(base&&key){if(await rpc('complete_web_reading',claimed))return;}
  else{
   const browser=browsers.get(claimed.browser),network=networks.get(claimed.network);
   if(browser?.expires_at===claimed.expires_at&&Date.parse(browser.expires_at)>Date.now()){
    browser.completed=true;
    if(network?.expires_at===claimed.expires_at)network.completed=true;
    return;
   }
  }
  throw new Error('Your web reading reservation expired. Please try again.');
 }
 // A failed forecast gives the visitor their reading back.
 async function release(claimed:Claim){
  if(base&&key){await rpc('release_web_reading',claimed).catch(()=>{});return}
  const browser=browsers.get(claimed.browser),network=networks.get(claimed.network);
  if(browser?.expires_at===claimed.expires_at&&!browser.completed)browsers.delete(claimed.browser);
  if(network?.expires_at===claimed.expires_at&&!network.completed)networks.delete(claimed.network);
 }
 return {claim,complete,release};
}
