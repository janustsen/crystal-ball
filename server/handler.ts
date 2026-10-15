import {checkInDate} from '../src/retention.ts';
import {readingAge,sunSign,validPersonName} from '../src/profile.ts';
import {viewerChart} from './viewer-chart.ts';
import {chartWeather,personalOmen,selfInsight,yearAhead} from './omen.ts';
import {skyOn} from '../src/real-sky.ts';
import {monthName,monthsFrom} from '../src/year-ahead.ts';
import {insightKinds,selfAnswers} from '../src/ball-asks.ts';
import { makePlan, predict } from './engine.ts';
import {bondReading} from './bond.ts';
import {validFirstName} from '../src/social-policy.ts';
import { requireAiConsent, provider, type ModelProvider } from './provider.ts';
import type { Facts } from '../src/types.ts';
import {socialHandler} from './social.ts';
import {billing,billingHandler,BillingError} from './billing.ts';
import {assignEdition} from '../src/delight.ts';
import {webReadings} from './web-reading.ts';
export function handler(env:(key:string)=>string|undefined,injectedModel?:ModelProvider) {
 const model=injectedModel??provider(env),omenModel=injectedModel??provider(env,160),insightModel=injectedModel??provider(env,240),yearModel=injectedModel??provider(env,900,90000);
 const meter=billing(env),web=webReadings(env),social=socialHandler(env,model,meter),store=billingHandler(env);
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
   if(!body||typeof body!=='object'||!('question'in body)||typeof body.question!=='string'||body.question.trim().length<4||body.question.length>500||!('action'in body)||!['plan','predict','bond','omen','chart','insight','year'].includes(String(body.action)))throw new Error('Please ask a question between 4 and 500 characters.');
   requireAiConsent(env,'aiConsent' in body?body.aiConsent:undefined);
   const raw='facts'in body?body.facts:{};
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>30||Object.entries(raw).some(([k,v])=>k.length>50||typeof v!=='string'||v.length>300))throw new Error('Please shorten the answers and try again.');
   const rawBirthday='viewerBirthday'in body?body.viewerBirthday:undefined,personName='personName'in body?body.personName:undefined;
   const {birthday:viewerBirthday,chart}=viewerChart(rawBirthday,'viewerChart'in body?body.viewerChart:undefined);
   const ageConfirmed='ageConfirmed'in body?body.ageConfirmed:undefined;
   if(ageConfirmed!==undefined&&typeof ageConfirmed!=='boolean')throw new Error('Please confirm your age.');
   const teen=readingAge(viewerBirthday,ageConfirmed)!=='adult';
   if(personName!==undefined&&(typeof personName!=='string'||!(body.action==='bond'?validFirstName(personName):validPersonName(personName))))throw new Error('Use a first name only.');
   const localDate='localDate'in body?body.localDate:undefined;
   if(localDate!==undefined&&(typeof localDate!=='string'||!checkInDate(localDate)))throw new Error('Please provide a valid local calendar date.');
   // Moon and rising are a Plus depth: with billing, only a current Plus viewer's chart reaches the reading.
   const plusChart=async(viewer:string|null)=>chart&&(!meter||(await meter.balance(viewer??await meter.user(request))).plus)?chart:undefined;
   const context={viewerBirthday,ageConfirmed,personName,localDate};
   const facts=raw as Facts,question=body.question.trim();
   if(body.action==='predict'&&'webReading'in body){
    // A sealed-link browser visitor's one free reading: limited by browser, network and a daily cap, never by an account.
    const claimed=await web.claim(request,body.webReading);
    const result=await predict(question,facts,false,model,context).catch(async error=>{await web.release(claimed);throw error});
    if(result.kind==='ok')await web.complete(claimed);else await web.release(claimed);
    return new Response(JSON.stringify(result.kind==='ok'?{...result,value:assignEdition(result.value,false)}:result),{headers});
   }
   if(body.action==='bond'&&personName===undefined)throw new Error('Use a first name only.');
   if(body.action==='predict'||body.action==='bond'){
    // Readings are charged only after a successful forecast; failed attempts use none.
    // A signed-in app expects metering; an engine without billing config must not serve it free.
    if(!meter&&request.headers.get('authorization'))throw new BillingError('Readings are unavailable right now. Please try again later.',503);
    const viewer=meter?await meter.user(request):null;
    const charge=viewer?await meter!.authorizeCharge(viewer,'requestId' in body?body.requestId:undefined,{question,friend:'friend' in body&&body.friend===true,personName,facts}):null;
    const readingContext={...context,viewerChart:await plusChart(viewer)};
    const result=body.action==='bond'?await bondReading({name:String(personName)},model,readingContext):await predict(question,facts,'friend'in body&&body.friend===true,model,readingContext);
    if(result.kind!=='ok')return new Response(JSON.stringify(result),{headers});
    // Unmetered loopback preview only: the device owns its simulated plan, so its Plus claim sets the odds.
    if(!viewer)return new Response(JSON.stringify({...result,value:assignEdition(result.value,'plus'in body&&body.plus===true)}),{headers});
    const balance=await meter!.charge(viewer,charge!);
    return new Response(JSON.stringify({...result,value:await meter!.edition(viewer,result.value,balance.plus),balance}),{headers});
   }
   if(body.action==='chart'){
    if(!chart)throw new Error('Add your birth time and place in You first.');
    // The viewer's local month, which can differ from the server's by at most a day across time zones.
    const today=new Date().toISOString().slice(0,10),day=typeof localDate==='string'?localDate:today;
    if(Math.abs(Date.parse(day)-Date.parse(today))>86400000)throw new Error('Please check your device date.');
    const month=day.slice(0,7),signs=[sunSign(viewerBirthday as string),chart.moonSign,chart.risingSign].join('/'),generate=()=>chartWeather({sunSign:sunSign(viewerBirthday as string)!,...chart},month,omenModel);
    // With billing, the database enforces Plus and keeps the month's single reading; the loopback preview generates directly.
    const text=meter?await meter.chartWeather(await meter.user(request),month,signs,generate):await generate();
    return new Response(JSON.stringify({kind:'ok',value:{text}}),{headers});
   }
   if(body.action==='year'){
    if(!meter&&request.headers.get('authorization'))throw new BillingError('Year ahead is unavailable right now.',503);
    if(meter&&!(await meter.balance(await meter.user(request))).yearAhead)throw new BillingError('Purchase Year ahead or the Yearly plan first.',403);
    if(typeof localDate!=='string')throw new Error('Please provide a valid local calendar date.');
    const months=monthsFrom(localDate),sun=viewerBirthday?sunSign(viewerBirthday)??null:null;
    const forecasts=await yearAhead({sunSign:sun,facts,months:months.map(m=>`${monthName(m)} ${m.slice(0,4)}`)},teen,yearModel);
    return new Response(JSON.stringify({kind:'ok',value:{months:months.map((month,i)=>({month,headline:forecasts[i]}))}}),{headers});
   }
   if(body.action==='insight'){
    const kind='insightKind'in body?body.insightKind:undefined;
    if(!insightKinds.some(k=>k===kind))throw new Error('Choose an insight.');
    const answers=selfAnswers(facts,teen).slice(-30).map(({question,answer})=>({question,answer}));
    if(answers.length<3)throw new Error('Answer a few more questions first.');
    return new Response(JSON.stringify({kind:'ok',value:await selfInsight(answers,kind as typeof insightKinds[number],teen,insightModel)}),{headers});
   }
   if(body.action==='omen'){
    if(typeof localDate!=='string'||!('timeZone'in body)||typeof body.timeZone!=='string'||!body.timeZone||body.timeZone.length>100)throw new Error('Please provide your local date and time zone.');
    const sky=skyOn(localDate,body.timeZone);
    return new Response(JSON.stringify({kind:'ok',value:await personalOmen(facts,omenModel,sky)}),{headers});
   }
   const result=await makePlan(question,facts,model,context);
   return new Response(JSON.stringify(result),{headers});
  } catch(error){return new Response(JSON.stringify({kind:'error',message:error instanceof Error?error.message:'Please try again.'}),{status:error instanceof BillingError?error.status:400,headers});}
 };
}
