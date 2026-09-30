import type {Facts,Result,Plan,Prediction,ReadingContext} from './types';
export const engineUrl=process.env.EXPO_PUBLIC_ENGINE_URL||(typeof window!=='undefined'&&window.location?.protocol.startsWith('http')?`${window.location.origin}/engine`:'http://127.0.0.1:8787');
export async function request<T extends Plan|Prediction>(action:'plan'|'predict',question:string,facts:Facts,friend:boolean,signal:AbortSignal,context:ReadingContext={}):Promise<Result<T>>{
 const response=await fetch(engineUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,question,facts,friend,...context}),signal});
 const result=await response.json();
 if(!result||!['ok','blocked','error'].includes(result.kind))throw new Error('The mist is too thick. Please try again.');
 return result;
}
