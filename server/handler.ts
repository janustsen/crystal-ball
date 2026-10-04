import {checkInDate} from '../src/retention.ts';
import {readingAge,validBirthday,validPersonName} from '../src/profile.ts';
import {personalOmen} from './omen.ts';
import { makePlan, predict } from './engine.ts';
import { requireAiConsent, provider, type ModelProvider } from './provider.ts';
import type { Facts } from '../src/types.ts';
import {socialHandler} from './social.ts';
import {billing,billingHandler,BillingError} from './billing.ts';
export function handler(env:(key:string)=>string|undefined,injectedModel?:ModelProvider) {
 const model=injectedModel??provider(env),omenModel=injectedModel??provider(env,160);
 const meter=billing(env),social=socialHandler(env,model,meter),store=billingHandler(env);
 return async(request:Request):Promise<Response>=>{
  const path=new URL(request.url).pathname;
  if(path.endsWith('/social'))return social(request);
  const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':env('APP_ORIGIN')||'http://localhost:8087','Access-Control-Allow-Headers':'content-type, authorization, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'};
  if(request.method==='OPTIONS')return new Response(null,{headers});
  if(path.endsWith('/billing')||path.endsWith('/revenuecat'))return store(request,headers);
  if(request.method!=='POST')return new Response(JSON.stringify({kind:'error',message:'Use POST.'}),{status:405,headers});
  try {
   const text=await request.text();if(text.length>20000)throw new Error('Request too large.');
   const body:unknown=JSON.parse(text);
   if(!body||typeof body!=='object'||!('question'in body)||typeof body.question!=='string'||body.question.trim().length<4||body.question.length>500||!('action'in body)||!['plan','predict','omen'].includes(String(body.action)))throw new Error('Please ask a question between 4 and 500 characters.');
   requireAiConsent(env,'aiConsent' in body?body.aiConsent:undefined);
   const raw='facts'in body?body.facts:{};
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>30||Object.entries(raw).some(([k,v])=>k.length>50||typeof v!=='string'||v.length>300))throw new Error('Please shorten the answers and try again.');
   const viewerBirthday='viewerBirthday'in body?body.viewerBirthday:undefined,personName='personName'in body?body.personName:undefined;
   if(viewerBirthday!==undefined&&(typeof viewerBirthday!=='string'||!validBirthday(viewerBirthday)))throw new Error('Please check your birthday.');
   const ageConfirmed='ageConfirmed'in body?body.ageConfirmed:undefined;
   if(ageConfirmed!==undefined&&typeof ageConfirmed!=='boolean')throw new Error('Please confirm your age.');
   readingAge(viewerBirthday,ageConfirmed);
   if(personName!==undefined&&(typeof personName!=='string'||!validPersonName(personName)))throw new Error('Use a first name only.');
   const localDate='localDate'in body?body.localDate:undefined;
   if(localDate!==undefined&&(typeof localDate!=='string'||!checkInDate(localDate)))throw new Error('Please provide a valid local calendar date.');
   const context={viewerBirthday,ageConfirmed,personName,localDate};
   const facts=raw as Facts,question=body.question.trim();
   if(body.action==='predict'){
    // Readings are charged only after a successful forecast; failed attempts use none.
    // A signed-in app expects metering; an engine without billing config must not serve it free.
    if(!meter&&request.headers.get('authorization'))throw new BillingError('Readings are unavailable right now. Please try again later.',503);
    const viewer=meter?await meter.user(request):null;
    const charge=viewer?await meter!.authorizeCharge(viewer,'requestId' in body?body.requestId:undefined,{question,friend:'friend' in body&&body.friend===true,personName}):null;
    const result=await predict(question,facts,'friend'in body&&body.friend===true,model,context);
    return new Response(JSON.stringify(viewer&&result.kind==='ok'?{...result,balance:await meter!.charge(viewer,charge!)}:result),{headers});
   }
   const result=body.action==='omen'?{kind:'ok',value:{text:await personalOmen(facts,omenModel)}}:await makePlan(question,facts,model,context);
   return new Response(JSON.stringify(result),{headers});
  } catch(error){return new Response(JSON.stringify({kind:'error',message:error instanceof Error?error.message:'Please try again.'}),{status:error instanceof BillingError?error.status:400,headers});}
 };
}
