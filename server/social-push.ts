import {serverRpcs,type ServerRpc} from './rpc.ts';
// Run once per minute in a trusted scheduler. No private text enters a push payload.
const messages={seal:'Someone sealed a forecast for you.',invite:'You have a Circle invitation.',joined:'Someone joined your Circle.',forecast:'Your Circle has a new forecast.',vote:'Your Circle forecast is ready for its check-in.',sky:'The Sky is open.'} as const;
export function serviceRpc(env:(key:string)=>string|undefined,transport:typeof fetch=fetch){
 const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');
 if(!base||!key)throw new Error('Configure Supabase before running social jobs.');
 return async(name:ServerRpc,body:unknown)=>{
  const response=await transport(`${base}/rest/v1/${serverRpcs[name]}`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Social push queue unavailable.');
  return response.json();
 };
}
export async function deliverSocialPushes(env:(key:string)=>string|undefined,transport:typeof fetch=fetch){
 const rpc=serviceRpc(env,transport);
 const jobs:{id:string;token:string;kind:keyof typeof messages;circle_id:string|null}[]=[...await rpc('claim_social_pushes',{}),...await rpc('claim_sky_pushes',{})];
 let accepted=0;
 for(const job of jobs){
  if(!Object.hasOwn(messages,job.kind))throw new Error('Unsupported social notification.');
  const sky=job.kind==='sky';
  const response=await transport('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json',...(env('EXPO_ACCESS_TOKEN')?{Authorization:`Bearer ${env('EXPO_ACCESS_TOKEN')}`}:{})},body:JSON.stringify({to:job.token,title:'Crystal Ball',body:messages[job.kind],data:sky?{social:true,sky:true}:{social:true,circle:job.circle_id},sound:'default'}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)continue;
  const result=await response.json();
  if(result.data?.status==='ok'){await rpc(sky?'finish_sky_push':'finish_social_push',{notification:job.id});accepted++;}
 }
 return {queued:jobs.length,accepted};
}
