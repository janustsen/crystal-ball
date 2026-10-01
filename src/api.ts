import type {Facts,Result,Plan,Prediction} from './types';
export const engineUrl=process.env.EXPO_PUBLIC_ENGINE_URL||(typeof window!=='undefined'&&window.location?.protocol.startsWith('http')?`${window.location.origin}/engine`:'http://127.0.0.1:8787');
export const previewHeaders:Record<string,string>=process.env.EXPO_PUBLIC_PREVIEW_SECRET?{'x-preview-token':process.env.EXPO_PUBLIC_PREVIEW_SECRET}:{};
export async function request<T extends Plan|Prediction>(action:'plan'|'predict',question:string,facts:Facts,friend:boolean,signal:AbortSignal):Promise<Result<T>>{
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders},body:JSON.stringify({action,question,facts,friend}),signal});
 const result=await response.json();
 if(!result||!['ok','blocked','error'].includes(result.kind))throw new Error('The mist is too thick. Please try again.');
 return result;
}
