import test from 'node:test';
import assert from 'node:assert/strict';
import {circleReading,reconcileCircleReadings,saveReading} from '../src/reading-history';
import type {AccountState} from '../src/types';

test('social refresh recovers lost publication responses and charges each Reading once',async t=>{
 const previous={provider:process.env.EXPO_PUBLIC_AI_PROVIDER_NAME,url:process.env.EXPO_PUBLIC_SUPABASE_URL,key:process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,engine:process.env.EXPO_PUBLIC_ENGINE_URL};
 process.env.EXPO_PUBLIC_AI_PROVIDER_NAME='Candidate AI';
 process.env.EXPO_PUBLIC_SUPABASE_URL='http://127.0.0.1:55329';
 process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY='local-verification-only';
 process.env.EXPO_PUBLIC_ENGINE_URL='http://127.0.0.1:8795';
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}}});
 t.after(()=>{
  for(const [key,value] of Object.entries({EXPO_PUBLIC_AI_PROVIDER_NAME:previous.provider,EXPO_PUBLIC_SUPABASE_URL:previous.url,EXPO_PUBLIC_SUPABASE_ANON_KEY:previous.key,EXPO_PUBLIC_ENGINE_URL:previous.engine})){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
  if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
 });
 const {supabase}=await import('../src/cloud');assert.ok(supabase);
 await supabase.auth.initialize();await supabase.auth.stopAutoRefresh();
 t.mock.method(supabase.auth,'getSession',async()=>({data:{session:{access_token:'test-token',user:{id:'viewer'}}},error:null}));
 const {loadSocial,syncSocialProfile,prepareSocialDraft,friendForecast,publishCircleForecast}=await import('../src/social');
 let offline=true,reads=0;
 let failSchool=false;
 const writes:unknown[]=[];
 const day=new Date().toISOString().slice(0,10),forecast={id:'published-receipt',asker_id:'viewer',circle_id:'circle',question:'Will we learn together?',headline:'A shared skill may bring you together.',due_date:'9999-12-31',created_at:new Date().toISOString()};
 let published=false;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  if(String(input).endsWith('/social')){
   if(offline)return Response.json({message:'Engine offline'},{status:503});
   writes.push(JSON.parse(String(init?.body)));
   return Response.json({ok:true});
  }
  if(String(input).endsWith('/rpc/publish_circle_forecast')){published=true;throw new Error('Publication response lost');}
  if(published&&String(input).includes('/circle_forecasts?')){
   const fields=new URL(String(input)).searchParams.get('select')!.split(',');
   return Response.json([Object.fromEntries(Object.entries(forecast).filter(([key])=>fields.includes(key)))]);
  }
  assert.ok(writes.length>0,'snapshot reads must follow successful profile synchronization');
  reads++;
  if(failSchool&&/\/(schools|rpc\/school_circle_suggestions)\b/.test(String(input)))return Response.json({message:'unavailable'},{status:500});
  return Response.json([]);
 });
 const plus={plus:true,ageBand:'adult' as const,sunSign:'leo'};
 await assert.rejects(syncSocialProfile(plus),/Engine offline/);
 await assert.rejects(loadSocial(plus),/Engine offline/);
 assert.equal(reads,0);
 offline=false;
 assert.equal((await loadSocial(plus)).owner,'viewer');
 assert.deepEqual(writes,[{action:'profile',...plus}]);
 assert.equal(reads,16);
 const unknown={plus:false,ageBand:null,sunSign:null};
 await loadSocial(unknown);
 assert.deepEqual(writes,[{action:'profile',...plus},{action:'profile',...unknown}]);
 assert.equal(reads,32);
 failSchool=true;
 const partial=await loadSocial(plus);
 assert.deepEqual([partial.owner,partial.schools,partial.schoolSuggestions],['viewer',[],[]]);
 const target={circle:'circle',member:'friend',firstName:'Alex'},signal=new AbortController().signal;
 for(const aiConsent of ['', 'Other AI']){
  const before:number=writes.length;
  await assert.rejects(prepareSocialDraft('star','Will I learn Spanish?',aiConsent),/Allow Candidate AI/);
  await assert.rejects(prepareSocialDraft('seal','A creative opportunity may arrive.',aiConsent),/Allow Candidate AI/);
  await assert.rejects(friendForecast('What lies ahead for Alex?',target,signal,aiConsent),/Allow Candidate AI/);
  assert.equal(writes.length,before);
 }
 await prepareSocialDraft('star','Will I learn Spanish?','Candidate AI');
 await prepareSocialDraft('seal','A creative opportunity may arrive.','Candidate AI');
 await friendForecast('What lies ahead for Alex?',target,signal,'Candidate AI');
 assert.deepEqual(writes.slice(-3),[
  {action:'draft',kind:'star',text:'Will I learn Spanish?',aiConsent:'Candidate AI'},
  {action:'draft',kind:'seal',text:'A creative opportunity may arrive.',aiConsent:'Candidate AI'},
  {action:'friend',question:'What lies ahead for Alex?',...target,aiConsent:'Candidate AI'},
 ]);
 const before=writes.length;
 await assert.rejects(prepareSocialDraft('star','Will I learn Spanish?'),/Allow Candidate AI/);
 assert.equal(writes.length,before);
 await assert.rejects(publishCircleForecast(forecast.id),/Publication response lost/);
 const beforeRecovery:AccountState={sunSign:'leo',ageBand:'adult',ageConfirmed:true,facts:{},history:[],credits:2,plus:false,usage:{day,count:1},reduceMotion:false,largeText:false};
 const snapshot=await loadSocial(plus);
 const recovered=reconcileCircleReadings(beforeRecovery,snapshot);
 assert.deepEqual(recovered.history,[circleReading(forecast)]);
 assert.equal(recovered.credits,1);assert.equal(recovered.usage.count,2);
 assert.strictEqual(reconcileCircleReadings(recovered,await loadSocial(plus)),recovered);
 const ordinary=saveReading(beforeRecovery,circleReading(forecast));
 assert.deepEqual(ordinary,recovered);
 assert.strictEqual(reconcileCircleReadings(ordinary,snapshot),ordinary);
 assert.strictEqual(reconcileCircleReadings(beforeRecovery,{...snapshot,owner:'another-user'}),beforeRecovery);
 assert.strictEqual(reconcileCircleReadings(beforeRecovery,{...snapshot,forecasts:[{...forecast,due_date:day}]}),beforeRecovery);
 const free=saveReading({...beforeRecovery,usage:{day,count:0}},circleReading(forecast));
 assert.equal(free.credits,2);assert.equal(free.usage.count,1);
 const rollover=saveReading({...beforeRecovery,usage:{day:'2000-01-01',count:5}},circleReading(forecast));
 assert.equal(rollover.credits,2);assert.equal(rollover.usage.count,1);
 const plusReading=saveReading({...beforeRecovery,plus:true,usage:{day,count:9}},circleReading(forecast));
 assert.equal(plusReading.credits,2);assert.equal(plusReading.usage.count,10);
 const blocked={...beforeRecovery,onboardingBlocked:true};
 assert.strictEqual(saveReading(blocked,circleReading(forecast)),blocked);

});
