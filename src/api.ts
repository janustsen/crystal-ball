import type {Facts,Result,Plan,Prediction} from './types';
const url=process.env.EXPO_PUBLIC_ENGINE_URL||'http://127.0.0.1:8787';
export async function request<T extends Plan|Prediction>(action:'plan'|'predict',question:string,facts:Facts,friend:boolean,signal:AbortSignal):Promise<Result<T>>{
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,question,facts,friend}),signal});
 const result=await response.json();
 if(!result||!['ok','blocked','error'].includes(result.kind))throw new Error('The mist is too thick. Please try again.');
 return result;
}
