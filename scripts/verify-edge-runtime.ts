// Run with Deno and the functions import map. Local Ollama only; never calls a paid provider.
import {handler} from '../server/handler.ts';
import {socialHandler} from '../server/social.ts';
import {provider} from '../server/provider.ts';
import {solveProof} from '../src/web-reading.ts';
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message)};
const env=(key:string)=>key==='OLLAMA_URL'?'http://127.0.0.1:11435':undefined;
const handle=handler(env),question='Will I learn Spanish in six months?';
const facts={level:'Beginner',practice:'30 minutes',conversation:'Weekly',deadline:'In 6 months'};
const common={question,facts,viewerBirthday:'1995-06-15',ageConfirmed:true};
async function reading(label:string,body:object){
 const started=performance.now(),response=await handle(new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json','x-forwarded-for':'192.0.2.1'},body:JSON.stringify(body)})),value=await response.json();
 console.log(JSON.stringify({label,status:response.status,seconds:(performance.now()-started)/1000,result:value}));
 assert(response.ok&&value.kind==='ok',`${label} failed`);return value;
}
await reading('app prediction',{...common,action:'predict'});
await reading('daily omen',{...common,action:'omen',localDate:'2026-10-23',timeZone:'America/Los_Angeles'});
await reading('link visitor free reading',{...common,action:'predict',webReading:await solveProof(crypto.randomUUID())});
// Only Auth and PostgREST are fixtures here. Rewriting and moderation use actual local Qwen in Deno.
const original=globalThis.fetch;let published=false;
globalThis.fetch=async(input,init)=>{
 const url=String(input);
 if(!url.startsWith('https://fixture.invalid'))return original(input,init);
 if(url.endsWith('/auth/v1/user'))return Response.json({id:'00000000-0000-0000-0000-000000000001'});
 if(url.includes('/social_profiles?'))return Response.json([{age_band:'adult'}]);
 if(url.endsWith('/social_drafts')){published=true;return Response.json([{id:'fixture',...JSON.parse(String(init?.body))}]);}
 throw new Error('Unexpected database boundary');
};
try{
 const social=socialHandler(key=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'} as Record<string,string>)[key],provider(env));
 const response=await social(new Request('http://local/social',{method:'POST',headers:{authorization:'Bearer fixture'},body:JSON.stringify({action:'draft',kind:'star',text:'Will I learn to paint this year?'})}));
 console.log(JSON.stringify({label:'social rewrite and moderation',status:response.status,result:await response.json(),database:'fixture'}));
 assert(response.ok&&published,'Social inference failed');
}finally{globalThis.fetch=original;}
console.log('PASS: real local inference in the Deno runtime for app, omen, web and social paths; hosted auth and provider remain unverified.');
