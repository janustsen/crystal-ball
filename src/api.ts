import {localDay} from './retention';
import type {Facts,Result,Plan,Prediction,ReadingContext,AccountState,BallStyle,CardStyle,Insight,InsightKind} from './types';
import {selfAnswers,teenSafe,withoutSelf} from './ball-asks';
import type {Balance} from './billing';
import {secondSentence,type OmenReply} from './daily-omen';
import {validBalance} from './billing';
import {solveProof,type WebReading} from './web-reading';
import type {HeardFrom} from './heard-from';
export const aiProvider=process.env.EXPO_PUBLIC_AI_PROVIDER_NAME||'';
export const engineUrl=process.env.EXPO_PUBLIC_ENGINE_URL||(typeof window!=='undefined'&&window.location?.protocol.startsWith('http')?`${window.location.origin}/engine`:'http://127.0.0.1:8787');
export const previewHeaders:Record<string,string>=process.env.EXPO_PUBLIC_PREVIEW_SECRET?{'x-preview-token':process.env.EXPO_PUBLIC_PREVIEW_SECRET,...(typeof document==='undefined'?{Origin:new URL(engineUrl).origin}:{})}:{};
// A metered forecast returns the server's balance after its charge.
// A sealed-link browser visitor's free reading carries its bot-check proof instead of an account session.
export async function request<T extends Plan|Prediction>(action:'plan'|'predict'|'bond',question:string,facts:Facts,friend:boolean,signal:AbortSignal,context:ReadingContext={},aiConsent='',requestId?:string,webReading?:WebReading|null):Promise<Result<T>&{balance?:Balance}>{
 // null is an account request (Plus, credits or a linked account) and never takes the visitor path.
 if(action==='predict'&&webReading===undefined&&webReadingVisitor())webReading=await webReadingProof();
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders,...await sessionHeader()},body:JSON.stringify({action,question,facts,friend,...context,localDate:localDay(),aiConsent,requestId,webReading:webReading??undefined}),signal});
 const result=await response.json();
 if(!result||!['ok','blocked','error'].includes(result.kind))throw new Error('The mist is too thick. Please try again.');
 return result;
}

export async function requestOmen(facts:Facts,{sunSign,birthday,ageConfirmed}:Pick<AccountState,'sunSign'|'birthday'|'ageConfirmed'>,aiConsent=''):Promise<OmenReply>{
 facts=withoutSelf(facts);delete facts.sun_sign;
 if(sunSign)facts.sun_sign=sunSign;
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders,...await sessionHeader()},body:JSON.stringify({action:'omen',question:'Today’s personal insight',facts,viewerBirthday:birthday,ageConfirmed,aiConsent,localDate:localDay(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();
 if(!response.ok||result?.kind!=='ok'||typeof result.value?.text!=='string')throw new Error('Insight unavailable.');
 const whisper=typeof result.value.whisper==='string'?result.value.whisper.trim():'';
 if(whisper.length<20||whisper.length>140||!/^By tonight,/.test(whisper)||/[\r\n]/.test(whisper)||!/[.!?]$/.test(whisper)||secondSentence.test(whisper))throw new Error('Insight unavailable.');
 return {text:result.value.text,whisper};
}

// The Ball asks: a free insight from the most recent answers (the engine accepts at most 30 facts).
export async function requestInsight(facts:Facts,kind:InsightKind,{birthday,ageConfirmed}:Pick<AccountState,'birthday'|'ageConfirmed'>,aiConsent=''):Promise<Insight>{
 const recent=Object.fromEntries(selfAnswers(facts,teenSafe({birthday})).slice(-30).map(({key,answer})=>[key,answer]));
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders,...await sessionHeader()},body:JSON.stringify({action:'insight',question:'The Ball asks insight',insightKind:kind,facts:recent,viewerBirthday:birthday,ageConfirmed,aiConsent}),signal:AbortSignal.timeout(60000)});
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.kind!=='ok'||typeof result.value?.title!=='string'||typeof result.value?.text!=='string')throw new Error('Insight unavailable.');
 return {kind,title:result.value.title,text:result.value.text,at:new Date().toISOString()};
}

export async function requestChartWeather({birthday,ageConfirmed,moonSign,risingSign}:Pick<AccountState,'birthday'|'ageConfirmed'|'moonSign'|'risingSign'>,aiConsent='',localDate=localDay()):Promise<string>{
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders,...await sessionHeader()},body:JSON.stringify({action:'chart',question:'This month’s chart weather',facts:{},viewerBirthday:birthday,ageConfirmed,viewerChart:{moonSign,risingSign},localDate,aiConsent}),signal:AbortSignal.timeout(60000)});
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.kind!=='ok'||typeof result.value?.text!=='string')throw new Error(result?.message||'Chart weather is unavailable. Please try again later.');
 return result.value.text;
}

// Year ahead: the twelve months from the local month, written together so the app can seal them.
// Twelve forecasts in one call: the engine allows each attempt 90 seconds and one repair.
export async function requestYearAhead(facts:Facts,{sunSign,birthday,ageConfirmed}:Pick<AccountState,'sunSign'|'birthday'|'ageConfirmed'>,aiConsent='',localDate=localDay()):Promise<{month:string;headline:string}[]>{
 facts=withoutSelf(facts);delete facts.sun_sign;
 if(sunSign)facts.sun_sign=sunSign;
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders,...await sessionHeader()},body:JSON.stringify({action:'year',question:'Your year ahead',facts:Object.fromEntries(Object.entries(facts).slice(-30)),viewerBirthday:birthday,ageConfirmed,localDate,aiConsent}),signal:AbortSignal.timeout(200000)});
 const result=await response.json().catch(()=>null),months=result?.value?.months;
 if(!response.ok||result?.kind!=='ok'||!Array.isArray(months)||months.length!==12||!months.every((m:unknown)=>!!m&&typeof m==='object'&&typeof (m as {month?:unknown}).month==='string'&&typeof (m as {headline?:unknown}).headline==='string'))throw new Error(result?.message||'The Ball could not seal your year. Please try again.');
 return months;
}

// Sent without the account session: the engine counts the answer and nothing else.
export async function reportHeardFrom(source:HeardFrom){
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders},body:JSON.stringify({action:'heard',source}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Not counted.');
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
export const claimAskBonus=(answered:string[])=>billing({action:'askBonus',answered});
export const saveStyles=(ball:BallStyle,card:CardStyle)=>billing({action:'styles',ball,card});

// Browser-only markers; the server's per-browser, per-network and daily limits stay authoritative.
const local=(run:(storage:Storage)=>string|null|void)=>{try{return typeof localStorage==='undefined'?null:run(localStorage)??null}catch{return null}};
export const webReadingVisitor=()=>local(s=>s.getItem('cb.web-visitor'))==='1'||webReadingSpent()||!!local(s=>s.getItem('cb.web-browser'));
export const markWebReadingVisitor=()=>void local(s=>s.setItem('cb.web-visitor','1'));
export const webReadingSpent=()=>local(s=>s.getItem('cb.web-reading'))==='spent';
export const spendWebReading=()=>void local(s=>s.setItem('cb.web-reading','spent'));
export async function webReadingProof(){
 let browser=local(s=>s.getItem('cb.web-browser'));
 if(!browser){browser=(await import('./uuid')).uuid();const id=browser;local(s=>s.setItem('cb.web-browser',id))}
 return solveProof(browser);
}
