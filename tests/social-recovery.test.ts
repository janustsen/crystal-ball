import test from 'node:test';
import assert from 'node:assert/strict';

test('social recovery retries current profile before exposing a snapshot',async t=>{
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
 const {loadSocial,syncSocialProfile,prepareSocialDraft,friendForecast}=await import('../src/social');
 let offline=true,reads=0;
 let failSchool=false;
 const writes:unknown[]=[];
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  if(String(input).endsWith('/social')){
   if(offline)return Response.json({message:'Engine offline'},{status:503});
   writes.push(JSON.parse(String(init?.body)));
   return Response.json({ok:true});
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
});
