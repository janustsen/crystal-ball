import {localDay} from './retention';
import type {Facts,Result,Plan,Prediction,ReadingContext,AccountState,StyleName} from './types';
import type {Balance} from './billing';
import {validBalance} from './billing';
export const aiProvider=process.env.EXPO_PUBLIC_AI_PROVIDER_NAME||'';
export const engineUrl=process.env.EXPO_PUBLIC_ENGINE_URL||(typeof window!=='undefined'&&window.location?.protocol.startsWith('http')?`${window.location.origin}/engine`:'http://127.0.0.1:8787');
export const previewHeaders:Record<string,string>=process.env.EXPO_PUBLIC_PREVIEW_SECRET?{'x-preview-token':process.env.EXPO_PUBLIC_PREVIEW_SECRET}:{};
// A metered forecast returns the server's balance after its charge.
export async function request<T extends Plan|Prediction>(action:'plan'|'predict',question:string,facts:Facts,friend:boolean,signal:AbortSignal,context:ReadingContext={},aiConsent='',requestId?:string):Promise<Result<T>&{balance?:Balance}>{
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders,...action==='predict'?await sessionHeader():{}},body:JSON.stringify({action,question,facts,friend,...context,localDate:localDay(),aiConsent,requestId}),signal});
 const result=await response.json();
 if(!result||!['ok','blocked','error'].includes(result.kind))throw new Error('The mist is too thick. Please try again.');
 return result;
}

export async function requestOmen(facts:Facts,{sunSign,birthday,ageConfirmed}:Pick<AccountState,'sunSign'|'birthday'|'ageConfirmed'>,aiConsent=''):Promise<string>{
 facts={...facts};delete facts.sun_sign;
 if(sunSign)facts.sun_sign=sunSign;
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders},body:JSON.stringify({action:'omen',question:'Today’s personal omen',facts,viewerBirthday:birthday,ageConfirmed,aiConsent}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();
 if(!response.ok||result?.kind!=='ok'||typeof result.value?.text!=='string')throw new Error('Omen unavailable.');
 return result.value.text;
}

export async function requestChartWeather({birthday,ageConfirmed,moonSign,risingSign}:Pick<AccountState,'birthday'|'ageConfirmed'|'moonSign'|'risingSign'>,aiConsent='',localDate=localDay()):Promise<string>{
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders,...await sessionHeader()},body:JSON.stringify({action:'chart',question:'This month’s chart weather',facts:{},viewerBirthday:birthday,ageConfirmed,viewerChart:{moonSign,risingSign},localDate,aiConsent}),signal:AbortSignal.timeout(60000)});
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.kind!=='ok'||typeof result.value?.text!=='string')throw new Error(result?.message||'Chart weather is unavailable. Please try again later.');
 return result.value.text;
}

// With Supabase the server owns the reading balance; the loopback preview without it counts readings on-device.
export const serverMetered=!!process.env.EXPO_PUBLIC_SUPABASE_URL&&!!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Loaded on demand so importing the engine client never constructs the Supabase client.
const sessionHeader=async()=>serverMetered?(await import('./cloud')).authorization():{};
async function billing(body:Record<string,unknown>):Promise<Balance>{
 const response=await fetch(`${engineUrl}/billing`,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders,...await sessionHeader()},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const result=await response.json().catch(()=>null);
 if(!response.ok||!validBalance(result))throw new Error(result?.message||'Your reading balance is unavailable. Please try again.');
 return result;
}
export const loadBalance=()=>billing({action:'balance'});
export const syncStoreBalance=()=>billing({action:'sync'});
export const simulatePurchase=(kind:string)=>billing({action:'simulate',kind});
export const saveStyles=(ball:StyleName,card:StyleName)=>billing({action:'styles',ball,card});
