import {packReadings,packs,plans,plusEntitlement,readingsLeft,validBalance,type Balance} from '../src/billing.ts';
type Env=(key:string)=>string|undefined;
export class BillingError extends Error{constructor(message:string,readonly status:number){super(message)}}
export const noReadings='No readings left today. Choose Plus or a reading pack to keep going.';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const periodDays={week:7,month:30,year:365};

// RevenueCat v1 subscriber -> server entitlement. Pack transactions are credited once by their RevenueCat id.
export function storeEntitlements(subscriber:any){
 const plus=subscriber?.entitlements?.[plusEntitlement];
 const purchases=Object.entries(subscriber?.non_subscriptions??{}).flatMap(([product,list])=>{
  const readings=packReadings(product);
  return readings&&Array.isArray(list)?list.filter(t=>typeof t?.id==='string').map(t=>({id:`revenuecat:${t.id}`,readings})):[];
 });
 return {entitled_until:plus?(plus.expires_date??'infinity'):null,purchases};
}
// Every RevenueCat app user id on the event that is one of our Supabase users.
export function webhookUsers(body:any){
 const event=body?.event,ids=[event?.app_user_id,event?.original_app_user_id,...[event?.aliases,event?.transferred_from,event?.transferred_to].flatMap(list=>Array.isArray(list)?list:[])];
 return [...new Set(ids.filter(id=>typeof id==='string'&&uuid.test(id)))];
}

// Null without a Supabase service (the loopback preview): readings are then metered on-device only.
// Deployed edge functions always receive SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, so production meters every reading.
export function billing(env:Env){
 const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!key)return null;
 const service={apikey:key,authorization:`Bearer ${key}`,'Content-Type':'application/json'};
 async function rpc(name:string,args:object):Promise<Balance>{
  const response=await fetch(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers:service,body:JSON.stringify(args),signal:AbortSignal.timeout(5000)});
  const value=await response.json().catch(()=>null);
  if(!response.ok&&/No readings left/.test(value?.message))throw new BillingError(noReadings,402);
  if(!response.ok||!validBalance(value))throw new Error('Your reading balance is unavailable. Please try again.');
  return value;
 }
 async function user(request:Request){
  const authorization=request.headers.get('authorization');
  if(!authorization?.startsWith('Bearer '))throw new BillingError('Open an anonymous session first.',401);
  const identity=await fetch(`${base}/auth/v1/user`,{headers:{apikey:service.apikey,authorization},signal:AbortSignal.timeout(5000)});
  const value=identity.ok?await identity.json().catch(()=>null):null;
  if(typeof value?.id!=='string')throw new BillingError('Your session expired. Please try again.',401);
  return value.id as string;
 }
 // One ledger entry per ask (client key + everything that shapes the forecast): a retry is free once, then charged again.
 async function authorizeCharge(viewer:string,key:unknown,ask:{question:string;friend:boolean;personName?:string;circle?:string;member?:string;firstName?:string;facts?:Record<string,string>}){
  if(typeof key!=='string'||!uuid.test(key))throw new BillingError('Please start this question again.',400);
  const facts=Object.entries(ask.facts??{}).sort(([a],[b])=>a<b?-1:a>b?1:0);
  const identity=JSON.stringify([key.toLowerCase(),ask.question.trim(),ask.friend,ask.personName??null,ask.circle??null,ask.member??null,ask.firstName??null,facts]);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity));
  const reading=`ask:${Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')}`;
  const response=await fetch(`${base}/rest/v1/reading_charges?user_id=eq.${encodeURIComponent(viewer)}&reading_id=eq.${encodeURIComponent(reading)}&select=reading_id,uses`,{headers:service,signal:AbortSignal.timeout(5000)});
  const charges=await response.json();
  if(!response.ok||!Array.isArray(charges))throw new Error('Your reading balance is unavailable. Please try again.');
  const freeRetry=charges.length>0&&(charges[0].uses??1)<2;
  if(!freeRetry&&readingsLeft(await rpc('reading_balance',{viewer}))<=0)throw new BillingError(noReadings,402);
  return reading;
 }
 async function reconcile(viewer:string){
  const secret=env('REVENUECAT_SECRET_KEY');if(!secret)throw new BillingError('Store purchases are not connected yet.',503);
  const response=await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(viewer)}`,{headers:{authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('The App Store could not be checked. Please try again.');
  // request_date orders snapshots, so a delayed stale fetch cannot overwrite a newer renewal.
  const json=await response.json();
  return rpc('apply_store_entitlements',{viewer,...storeEntitlements(json.subscriber),...(typeof json.request_date==='string'?{snapshot_at:json.request_date}:{})});
 }
 // Local verification only: simulated purchases still flow through the real ledger.
 async function simulate(viewer:string,kind:unknown){
  if(env('SOCIAL_MOCK_ENTITLEMENTS')!=='true'||!['127.0.0.1','localhost','[::1]'].includes(new URL(base!).hostname))throw new BillingError('Test purchases are local-only.',403);
  const plan=plans.find(p=>p.kind===kind),pack=packs.find(p=>p.kind===kind);
  if(!plan&&!pack&&kind!=='off')throw new BillingError('Choose a plan or pack.',400);
  const entitled_until=plan?new Date(Date.now()+periodDays[plan.period]*86400000).toISOString():kind==='off'?null:(await rpc('reading_balance',{viewer})).plusUntil;
  return rpc('apply_store_entitlements',{viewer,entitled_until,purchases:pack?[{id:`mock:${crypto.randomUUID()}`,readings:pack.readings}]:[]});
 }
 return {user,reconcile,simulate,authorizeCharge,balance:(viewer:string)=>rpc('reading_balance',{viewer}),charge:(viewer:string,reading:string)=>rpc('charge_reading',{viewer,reading})};
}
export type Billing=NonNullable<ReturnType<typeof billing>>;

export function billingHandler(env:Env){
 const service=billing(env);
 return async(request:Request,headers:Record<string,string>):Promise<Response>=>{
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method!=='POST')return reply({message:'Use POST.'},405);
  try{
   if(new URL(request.url).pathname.endsWith('/revenuecat')){
    // RevenueCat sends the dashboard-configured Authorization value verbatim; any event triggers a full reconcile.
    const secret=env('REVENUECAT_WEBHOOK_AUTH');
    if(!service||!secret||request.headers.get('authorization')!==secret)return reply({message:'Unauthorized.'},401);
    for(const viewer of webhookUsers(await request.json()))await service.reconcile(viewer);
    return reply({ok:true});
   }
   if(!service)return reply({message:'Purchases are not connected in this preview.'},503);
   const viewer=await service.user(request),body=await request.json().catch(()=>null);
   if(body?.action==='balance')return reply(await service.balance(viewer));
   if(body?.action==='sync')return reply(await service.reconcile(viewer));
   if(body?.action==='simulate')return reply(await service.simulate(viewer,body.kind));
   return reply({message:'Choose a billing action.'},400);
  }catch(error){return reply({message:error instanceof Error?error.message:'Billing is unavailable.'},error instanceof BillingError?error.status:500)}
 };
}
