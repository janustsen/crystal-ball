import {appleJwt} from './apple-jwt.ts';
import {serverRpcs,type ServerRpc} from './rpc.ts';
// Run once per minute in a trusted scheduler. No private text enters a push payload.
const messages={seal:'Someone sealed a forecast for you.',invite:'You have a Circle invitation.',joined:'Someone joined your Circle.',forecast:'Your Circle has a new forecast.',vote:'Your Circle forecast is ready for its check-in.',sky:'The Sky is open.'} as const;
type Job={id:string;token:string;kind:keyof typeof messages;circle_id:string|null};
// The push service message for a queued job: a fixed sentence and routing data only.
export function pushMessage(job:Job){
 return {to:job.token,title:'Crystal Ball',body:messages[job.kind],data:job.kind==='sky'?{social:true,sky:true}:{social:true,circle:job.circle_id},sound:'default'};
}
// Native APNs payload; expo-notifications reads `data` back from `body`.
export function apnsPayload(message:ReturnType<typeof pushMessage>){
 return {aps:{alert:{title:message.title,body:message.body},sound:message.sound},body:message.data};
}
export function serviceRpc(env:(key:string)=>string|undefined,transport:typeof fetch=fetch){
 const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!key)throw new Error('Configure Supabase before running social jobs.');
 return async(name:ServerRpc,body:unknown)=>{
  const response=await transport(`${base}/rest/v1/${serverRpcs[name]}`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Social push queue unavailable.');
  return response.json();
 };
}
export type PushSender=(message:ReturnType<typeof pushMessage>)=>Promise<boolean>;
export async function apnsSender(env:(key:string)=>string|undefined,transport:typeof fetch=fetch):Promise<PushSender>{
 const team=env('APNS_TEAM_ID'),topic=env('APNS_BUNDLE_ID'),environment=env('APNS_ENVIRONMENT');
 if(!team||!topic||!['production','sandbox'].includes(environment||''))throw new Error('Configure APNs before delivering notifications.');
 const token=await appleJwt(env,'APNS',{iss:team,iat:Math.floor(Date.now()/1000)});
 const host=environment==='production'?'api.push.apple.com':'api.sandbox.push.apple.com';
 return async message=>{
  if(!/^[a-f0-9]{64,512}$/i.test(message.to))return false;
  const response=await transport(`https://${host}/3/device/${message.to}`,{method:'POST',headers:{authorization:`bearer ${token}`,'apns-topic':topic,'apns-push-type':'alert','apns-priority':'10','Content-Type':'application/json'},body:JSON.stringify(apnsPayload(message)),signal:AbortSignal.timeout(10000)});
  return response.status===200;
 };
}
export async function deliverSocialPushes(env:(key:string)=>string|undefined,transport:typeof fetch=fetch,send?:PushSender){
 // Validate credentials before claiming jobs. The explicit sender is for Simulator delivery only.
 send??=await apnsSender(env,transport);
 const rpc=serviceRpc(env,transport),started=performance.now();
 const jobs:Job[]=[...await rpc('claim_social_pushes',{}),...await rpc('claim_sky_pushes',{})];
 let accepted=0;
 for(const job of jobs){
  // Leave time for the last send and acknowledgment inside the free Edge worker window.
  if(performance.now()-started>100000)break;
  if(!Object.hasOwn(messages,job.kind))throw new Error('Unsupported social notification.');
  try{
   if(await send(pushMessage(job))){await rpc(job.kind==='sky'?'finish_sky_push':'finish_social_push',{notification:job.id});accepted++;}
  }catch{/* Network failures stay leased, then retry on the next scheduled run. */}
 }
 return {queued:jobs.length,accepted};
}
