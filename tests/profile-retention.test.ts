import test from 'node:test';
import assert from 'node:assert/strict';
import {birthdayProfile,updateBirthday,restoreProfile,canRead} from '../src/profile.ts';
import {request,requestOmen} from '../src/api.ts';
import {handler} from '../server/handler.ts';
import {loadDailyOmen,invalidateOmen} from '../src/daily-omen.ts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AccountState} from '../src/types.ts';

const account=():AccountState=>({...birthdayProfile('1995-06-15'),onboardingDone:true,birthTime:'14:30',birthPlace:'Copenhagen',moonSign:'aries',risingSign:'leo',ladder:{asked:0,opened:[]},facts:{birthday:'1995-06-15',current_focus:'Learning'},history:[{id:'reading',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-09-01T12:00:00Z',label:'Speculative',why:'Practice continues.',facts:{birthday:'1995-06-15',level:'Beginner'},sources:[],assumptions:[],friend:false}],credits:3,plus:false,usage:{day:'2026-10-01',count:1},reduceMotion:true,largeText:false});

test('birthday saves preserve unchanged charts; removal scrubs all readings and retains eligibility on reload',()=>{
 const original=account();assert.equal(updateBirthday(original,original.birthday),original);
 for(const birthday of [undefined,'1996-07-15']){
  const changed=updateBirthday(original,birthday),restored=restoreProfile(JSON.parse(JSON.stringify(changed)));
  assert.equal(restored.birthday,birthday);assert.equal(canRead(restored),true);assert.equal(restored.ageBand,'adult');assert.equal(restored.ageConfirmed,true);
  for(const key of ['birthTime','birthPlace','moonSign','risingSign'] as const)assert.equal(restored[key],undefined);
  assert.equal(restored.facts.birthday,undefined);assert.equal(restored.history[0].facts.birthday,undefined);
  assert.equal(restored.history[0].facts.level,'Beginner');assert.equal(restored.credits,3);assert.deepEqual(restored.usage,original.usage);
 }
 const teen={...original,...birthdayProfile('2010-01-01')};assert.equal(restoreProfile(updateBirthday(teen)).ageBand,'teen');
 const blocked={...original,onboardingBlocked:true,onboardingDone:false};assert.equal(canRead(updateBirthday(blocked)),false);
 assert.equal(canRead(updateBirthday({...original,birthday:undefined,ageConfirmed:false,onboardingDone:false})),false);
});

test('mirror replaces birthday-bearing payloads and retains owner-scoped deletion',async t=>{
 t.mock.method(AsyncStorage,'getItem',async()=>null);
 t.mock.method(AsyncStorage,'setItem',async()=>{});
 t.mock.method(AsyncStorage,'removeItem',async()=>{});
 const originalFetch=globalThis.fetch,oldUrl=process.env.EXPO_PUBLIC_SUPABASE_URL,oldKey=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
 process.env.EXPO_PUBLIC_SUPABASE_URL='https://mirror.invalid';process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY='test-only';
 const sent:{url:string;method:string;body:any}[]=[];
 globalThis.fetch=async(url,init)=>{sent.push({url:String(url),method:init?.method||'GET',body:init?.body?JSON.parse(String(init.body)):null});return new Response(null,{status:204});};
 try{
  const {mirror,supabase}=await import('../src/cloud.ts');assert.ok(supabase);await supabase.auth.initialize();
  supabase.auth.getSession=async()=>({data:{session:{user:{id:'owner-015'}}},error:null} as any);
  const owned={...account(),backupOwner:'owner-015'};
  await mirror(updateBirthday(owned));
  assert.equal(sent.length,3);
  assert.deepEqual(sent.map(({url,method})=>[new URL(url).pathname,method]),[['/rest/v1/knowledge','POST'],['/rest/v1/predictions','POST'],['/rest/v1/predictions','DELETE']]);
  assert.equal(sent[0].body.user_id,'owner-015');
  assert.equal(sent[0].body.facts.birthday,undefined);
  assert.equal(sent[1].body[0].payload.facts.birthday,undefined);
  assert.equal(sent[1].body[0].user_id,'owner-015');assert.equal(sent[1].body[0].id,'reading');
  assert.equal(new URL(sent[2].url).searchParams.get('user_id'),'eq.owner-015');
  assert.equal(new URL(sent[2].url).searchParams.get('id'),'not.in.(reading)');
  await mirror({...updateBirthday(owned),history:[]});
  assert.equal(sent.length,5);
  assert.equal(sent[3].method,'POST');assert.equal(new URL(sent[3].url).pathname,'/rest/v1/knowledge');
  assert.equal(sent[3].body.user_id,'owner-015');assert.equal(sent[3].body.facts.birthday,undefined);
  const deletion=sent.at(-1)!;assert.equal(deletion.method,'DELETE');assert.equal(new URL(deletion.url).searchParams.get('user_id'),'eq.owner-015');
  assert.equal(new URL(deletion.url).pathname,'/rest/v1/predictions');assert.equal(new URL(deletion.url).searchParams.get('id'),null);
  await supabase.auth.stopAutoRefresh();
 }finally{globalThis.fetch=originalFetch;for(const [key,value] of [['EXPO_PUBLIC_SUPABASE_URL',oldUrl],['EXPO_PUBLIC_SUPABASE_ANON_KEY',oldKey]]){if(value===undefined)delete process.env[key!];else process.env[key!]=value;}}
});

test('omen transport maps the current profile sign without changing the daily claim',async()=>{
 const originalFetch=globalThis.fetch,requests:any[]=[];
 globalThis.fetch=async(_url,init)=>{requests.push(JSON.parse(String(init?.body)));return Response.json({kind:'ok',value:{text:'A quiet moment brings a fresh perspective to your day.',whisper:'By tonight, a small plan may change for the better.'}});};
 try{
  for(const state of [account(),updateBirthday(account(),'1996-07-15'),restoreProfile(account()),updateBirthday(account())]){
   await requestOmen({...state.facts,sun_sign:'wrong'},state);
   assert.equal(requests.at(-1).facts.sun_sign,state.sunSign||undefined);
  }
  invalidateOmen();const values=new Map<string,string>();
  const storage={getItem:async(key:string)=>values.get(key)??null,setItem:async(key:string,value:string)=>{values.set(key,value);}};
  const now=()=>new Date('2026-10-01T12:00:00Z'),start=requests.length;
  await loadDailyOmen(storage,{},facts=>requestOmen(facts,account()),now,()=>{});
  await loadDailyOmen(storage,{},facts=>requestOmen(facts,updateBirthday(account())),now,()=>{});
  assert.equal(requests.length,start+1);
 }finally{globalThis.fetch=originalFetch;invalidateOmen();}
});

test('client local dates survive UTC rollover for every reading path and malformed dates stop before inference',async t=>{
 const originalFetch=globalThis.fetch,oldTZ=process.env.TZ;
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-10-01T00:30:00Z')});
 const call=handler(()=>undefined);let modelCalls=0;
 globalThis.fetch=async(url,init)=>{
  const body=JSON.parse(String(init?.body));
  if(body.action)return call(new Request('http://localhost',{method:'POST',body:JSON.stringify(body)}));
  modelCalls++;
  const input=JSON.parse(body.messages[1].content);
  const content=body.format.properties.prediction?{prediction:`${input.personName||'You'} will make progress.`,basis:'context_1',insight:'Regular practice continues.'}:body.format.properties.cards?{cards:[{question:'How often do you practice?',options:['Daily','Weekly','Rarely']}]}:(body.format.properties.fits?{reason:'fixture',fits:true}:{category:'allow'});
  return Response.json({message:{content:JSON.stringify(content)}});
 };
 try{
  for(const [zone,day,due] of [['America/Los_Angeles','2026-09-30','2026-10-01'],['Pacific/Kiritimati','2026-10-01','2026-10-02']]){
   process.env.TZ=zone;
   for(const action of ['plan','predict'] as const)for(const friend of [false,true])for(const personName of [undefined,'Alex']){
    if(action==='plan'&&personName)continue;
    const result=await request(action,personName?'Will Alex finish tomorrow?':'Will I finish tomorrow?',{context_1:'Daily practice',horizon:'tomorrow'},friend,new AbortController().signal,{ageConfirmed:true,personName});
    assert.equal(result.kind,'ok',JSON.stringify(result));
    if(action==='predict'&&result.kind==='ok')assert.equal((result.value as any).dueDate,due,day);
   }
  }
  for(const localDate of ['2026-02-30','2026-10-01T00:00:00Z','invalid',42]){
   const before=modelCalls;
   const response=await call(new Request('http://localhost',{method:'POST',body:JSON.stringify({action:'predict',question:'Will I finish?',facts:{},ageConfirmed:true,localDate})}));
   assert.equal(response.status,400);assert.equal(modelCalls,before);
  }
 }finally{globalThis.fetch=originalFetch;if(oldTZ===undefined)delete process.env.TZ;else process.env.TZ=oldTZ;}
});
