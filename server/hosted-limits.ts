import {BillingError, billing} from './billing.ts';
import {handler} from './handler.ts';
import type {HostedAccounting} from './provider.ts';

export const deepinfra={url:'https://api.deepinfra.com/v1/openai',model:'Qwen/Qwen3.5-9B',disclosure:'DeepInfra',contextTokens:262144} as const;
// Nanodollars, using the more expensive priority tier as the accounting ceiling (2026-10-20).
const inputNano=150,outputNano=225;
export const budgetMessage='The Ball has reached its monthly reading budget. Please come back next month.';
export const quotaMessage='You’ve reached today’s reading request limit. Please try again tomorrow.';
type Env=(key:string)=>string|undefined;

export function reservationCost(body:string){
 const value=JSON.parse(body);
 if(value.model!==deepinfra.model||!Number.isInteger(value.max_tokens)||value.max_tokens<1||value.max_tokens>1200)throw new Error('Unexpected hosted model budget.');
 // Reserve the entire context window: no tokenizer estimate can undercount a prompt or schema.
 return deepinfra.contextTokens*inputNano+value.max_tokens*outputNano;
}
export function usageCost(usage:unknown):number|null{
 if(!usage||typeof usage!=='object')return null;
 const u=usage as Record<string,unknown>,input=u.prompt_tokens,output=u.completion_tokens;
 if(typeof input!=='number'||typeof output!=='number'||!Number.isSafeInteger(input)||!Number.isSafeInteger(output)||input<0||output<0||input>deepinfra.contextTokens||output>1200)return null;
 return input*inputNano+output*outputNano;
}

export function hostedAccounting(env:Env,viewer:string,action:string):HostedAccounting{
 const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');
 let admitted:Promise<unknown>|undefined;
 async function rpc(name:string,args:object){
  const response=await fetch(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key!,authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(5000)});
  const value=await response.json().catch(()=>null);
  if(!response.ok){
   if(value?.message==='AI monthly budget reached')throw new BillingError(budgetMessage,429);
   if(value?.message==='AI daily quota reached')throw new BillingError(quotaMessage,429);
   throw new BillingError('Readings are unavailable right now. Please try again later.',503);
  }
  return value;
 }
 return {
  async reserve(body){
   if(!base||!key)throw new BillingError('Readings are unavailable right now. Please try again later.',503);
   const reserved=reservationCost(body);
   // One request quota covers all classification/generation calls and the single allowed repair.
   admitted??=rpc('admit_ai_request',{viewer,action});await admitted;
   const id=crypto.randomUUID();
   const value=await rpc('reserve_ai_spend',{reservation:id,amount:reserved});
   if(value!==id)throw new BillingError('Readings are unavailable right now. Please try again later.',503);
   return id;
  },
  async settle(reservation,usage){
   const actual=usageCost(usage);
   // Missing usage, timeouts and failures retain the full reservation, including across restarts.
   if(actual===null)return;
   await rpc('settle_ai_spend',{reservation,spent:actual});
  },
 };
}

// Only the Edge Function uses this boundary. The Node adapter remains private, local development tooling.
export function publicHandler(env:Env){
 return async(request:Request):Promise<Response>=>{
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':env('APP_ORIGIN')||'http://localhost:8087','Access-Control-Allow-Headers':'content-type, authorization, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const error=(message:string,status:number)=>Response.json({kind:'error',message},{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{headers});
  if(request.method!=='POST')return error('Use POST.',405);
  try{
   const text=await request.clone().text();
   if(text.length>20000)return error('Request too large.',413);
   const body=JSON.parse(text);
   if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.action!=='string')return error('Choose a reading.',400);
   // The aggregate attribution counter has no inference and intentionally reads no identity.
   if(body.action==='heard'&&!new URL(request.url).pathname.endsWith('/social'))return handler(env)(request);
   const meter=billing(env);
   if(!meter)throw new BillingError('Readings are unavailable right now. Please try again later.',503);
   const viewer=await meter.user(request);
   if(env('HOSTED_QUALITY_APPROVED')!=='true'||env('MODEL_PROVIDER')!=='hosted'||env('HOSTED_MODEL_URL')!==deepinfra.url||env('HOSTED_MODEL_NAME')!==deepinfra.model||env('HOSTED_MODEL_DISCLOSURE')!==deepinfra.disclosure||!env('HOSTED_MODEL_KEY'))throw new BillingError('Public readings are not available yet. Please try again later.',503);
   const action=new URL(request.url).pathname.endsWith('/social')?`social:${body.action}`:body.action;
   return await handler(env,undefined,hostedAccounting(env,viewer,action))(request);
  }catch(cause){return error(cause instanceof BillingError?cause.message:'Readings are unavailable right now. Please try again later.',cause instanceof BillingError?cause.status:503)}
 };
}
