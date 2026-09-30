import type {Facts,Result,Plan,Prediction,ReadingContext} from './types';
export const aiProvider=process.env.EXPO_PUBLIC_AI_PROVIDER_NAME||'';
export const engineUrl=process.env.EXPO_PUBLIC_ENGINE_URL||(typeof window!=='undefined'&&window.location?.protocol.startsWith('http')?`${window.location.origin}/engine`:'http://127.0.0.1:8787');
export const previewHeaders:Record<string,string>=process.env.EXPO_PUBLIC_PREVIEW_SECRET?{'x-preview-token':process.env.EXPO_PUBLIC_PREVIEW_SECRET}:{};
export async function request<T extends Plan|Prediction>(action:'plan'|'predict',question:string,facts:Facts,friend:boolean,signal:AbortSignal,context:ReadingContext={},aiConsent=''):Promise<Result<T>>{
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders},body:JSON.stringify({action,question,facts,friend,...context,aiConsent}),signal});
 const result=await response.json();
 if(!result||!['ok','blocked','error'].includes(result.kind))throw new Error('The mist is too thick. Please try again.');
 return result;
}

export async function requestOmen(facts:Facts,aiConsent=''):Promise<string>{
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders},body:JSON.stringify({action:'omen',question:'Today’s personal omen',facts,aiConsent}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();
 if(!response.ok||result?.kind!=='ok'||typeof result.value?.text!=='string')throw new Error('Omen unavailable.');
 return result.value.text;
}
