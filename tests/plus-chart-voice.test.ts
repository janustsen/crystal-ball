import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../server/handler.ts';
import {astrologyLine,forgetBirthChart,restoreProfile,updateBirthday} from '../src/profile.ts';
import {narration} from '../src/delight.ts';
import type {AccountState} from '../src/types.ts';

const viewer='0f0e0d0c-0b0a-4908-8706-050403020100',birthday='1995-06-15',chart={moonSign:'pisces',risingSign:'virgo'};
const balance=(plus:boolean)=>({owner:viewer,asOf:'2026-10-04T00:00:00.000001Z',plus,plusUntil:plus?'2099-01-01T00:00:00Z':null,packs:0,used:0,day:'2026-10-04'});
const billed=(key:string)=>({SUPABASE_URL:'http://127.0.0.1:55321',SUPABASE_SERVICE_ROLE_KEY:'test-only'} as Record<string,string>)[key];

// Fake Ollama and Supabase boundaries; the weather text is what the model "writes".
function boundary(t:any,{plus=false,failSave=false,weather=['Gemini Sun, Pisces Moon and Virgo rising invite a slower, kinder pace this month. Let small rituals steady you.']}={}){
 const prompts:any[]=[],stored=new Map<string,string|null>(),rpcs:string[]=[];let weatherCalls=0;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=new URL(String(input)),body=init?.body?JSON.parse(String(init.body)):null;
  if(body?.messages){
   const fields=body.format.properties,input=JSON.parse(body.messages[1].content);prompts.push(input);
   const content=fields.prediction?{prediction:input.choices?.[0]||(input.personName?`${input.personName} will finish the course.`:'You will finish your course.'),basis:'context_1',assumption:'Daily practice continues.'}:fields.headline?{headline:'A creative opportunity may arrive.',why:'Only a sun sign and broad activity themes are known.'}:fields.text?{text:weather[Math.min(weatherCalls++,weather.length-1)]}:fields.safe?{safe:true}:{category:'allow'};
   return Response.json({message:{content:JSON.stringify(content)}});
  }
  if(url.hostname==='news.google.com')return new Response('<rss/>');
  if(url.pathname==='/rest/v1/social_profiles')return Response.json([{age_band:'adult'}]);
  if(url.pathname==='/rest/v1/rpc/authorize_friend_reading')return Response.json({sun_sign:'leo',themes:['growth']});
  if(url.pathname==='/auth/v1/user')return Response.json({id:viewer});
  if(url.pathname==='/rest/v1/reading_charges')return Response.json([]);
  if(url.pathname==='/rest/v1/rpc/reading_balance'||url.pathname==='/rest/v1/rpc/charge_reading')return Response.json(balance(plus));
  // Mirrors the chart_weather claim functions (proved on PostgreSQL by scripts/chart-weather-rls.sql).
  if(url.pathname.startsWith('/rest/v1/rpc/')&&url.pathname.includes('chart_weather')){
   const name=url.pathname.slice(13),key=`${body.viewer}:${body.target_month}`;rpcs.push(name);
   if(name==='claim_chart_weather'){
    if(!plus)return Response.json({message:'Chart weather is a Plus extra'},{status:400});
    if(!stored.has(key)){stored.set(key,null);return Response.json({claimed:true})}
    const text=stored.get(key);return Response.json(text?JSON.parse(text):{claimed:false});
   }
   if(name==='save_chart_weather'){if(failSave)return Response.json({message:'unavailable'},{status:500});const saved=stored.get(key)??JSON.stringify({text:body.weather,chart:body.weather_chart});stored.set(key,saved);return Response.json(JSON.parse(saved).text)}
   if(name==='release_chart_weather'){if(stored.get(key)===null)stored.delete(key);return new Response(null,{status:204})}
  }
  throw new Error(`Unexpected URL: ${url}`);
 });
 return {prompts,stored,rpcs,weatherCalls:()=>weatherCalls};
}
const ask=(serve:(r:Request)=>Promise<Response>,body:object)=>serve(new Request('http://localhost/',{method:'POST',headers:{authorization:'Bearer user-token'},body:JSON.stringify({question:'Will I finish my course?',facts:{context_1:'Daily practice',horizon:'next month',birthday},viewerBirthday:birthday,localDate:'2026-10-06',requestId:'11111111-1111-4111-8111-111111111111',...body})}));

test('Moon and rising join the Why astrology line',()=>{
 assert.equal(astrologyLine(birthday,chart),'Under your Gemini Sun, Pisces Moon and Virgo rising, consider this a playful invitation to your next chapter.');
 assert.equal(astrologyLine(birthday),'Under your Gemini Sun, consider this a playful invitation to your next chapter.');
 assert.equal(astrologyLine(),'The stars offer a playful lens on your next chapter.');
});

test('only a Plus viewer’s chart shapes the Why when billing is on',async t=>{
 for(const plus of [false,true]){
  t.mock.restoreAll();boundary(t,{plus});
  const result=await (await ask(handler(billed),{action:'predict',viewerChart:chart})).json();
  assert.equal(result.kind,'ok');assert.equal(result.value.astrology.includes('Pisces Moon and Virgo rising'),plus);
 }
});

test('chart signs are validated at the boundary before inference',async t=>{
 const fake=boundary(t),serve=handler(()=>undefined);
 for(const viewerChart of [{moonSign:'pluto',risingSign:'virgo'},{moonSign:'pisces'},'pisces'])assert.equal((await ask(serve,{action:'predict',viewerChart})).status,400);
 assert.equal((await ask(serve,{action:'chart',viewerChart:chart,viewerBirthday:undefined,ageConfirmed:true})).status,400);
 assert.equal(fake.prompts.length,0);
});

test('viewer chart survives subject filtering in every engine reading mode',async t=>{
 const cases=[
  {question:'Will I finish my course?',facts:{context_1:'Daily practice',horizon:'next month'}},
  {question:'Will Alex finish the course?',personName:'Alex',facts:{context_1:'Daily practice',horizon:'next month',birthday:'1990-01-01'}},
  {question:'Will electric vehicles gain ground next year?',facts:{definition:'A noticeable shift',scenario:'Current conditions continue',evidence:'No additional evidence'}},
  {question:'Who will win the 2030 World Cup?',facts:{competition:'Men’s World Cup',edition:'2030',team:'Argentina'}},
  {question:'Will a friend finish the course?',friend:true,facts:{context_1:'Daily practice',horizon:'next month'}},
 ];
 for(const plus of [false,true])for(const input of cases){
  t.mock.restoreAll();boundary(t,{plus});
  const result=await (await ask(handler(billed),{action:'predict',viewerChart:chart,...input})).json();
  assert.equal(result.kind,'ok',JSON.stringify(result));
  assert.equal(result.value.astrology,astrologyLine(birthday,plus?chart:undefined),input.question);
  assert.equal(result.value.facts.birthday,undefined);
 }
});

test('friendForecast forwards the viewer birthday and chart',async t=>{
 const env={EXPO_PUBLIC_AI_PROVIDER_NAME:'Candidate AI',EXPO_PUBLIC_SUPABASE_URL:'http://127.0.0.1:55329',EXPO_PUBLIC_SUPABASE_ANON_KEY:'local-verification-only',EXPO_PUBLIC_ENGINE_URL:'http://127.0.0.1:8795'};
 const previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
 Object.assign(process.env,env);
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}}});
 t.after(()=>{
  for(const [key,value] of Object.entries(previous)){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
  if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
 });
 const {supabase}=await import('../src/cloud');assert.ok(supabase);
 await supabase.auth.initialize();await supabase.auth.stopAutoRefresh();
 t.mock.method(supabase.auth,'getSession',async()=>({data:{session:{access_token:'test-token',user:{id:viewer}}},error:null}));
 const {friendForecast}=await import('../src/social');
 const writes:unknown[]=[];
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  assert.equal(String(input),'http://127.0.0.1:8795/social');
  writes.push(JSON.parse(String(init?.body)));
  return Response.json({ok:true});
 });
 const target={circle:'circle',member:'friend',firstName:'Alex'},context={viewerBirthday:birthday,viewerChart:chart};
 await friendForecast('What lies ahead for Alex?',target,new AbortController().signal,'Candidate AI',undefined,context);
 assert.deepEqual(writes,[{action:'friend',question:'What lies ahead for Alex?',...target,aiConsent:'Candidate AI',...context}]);
});

test('Circle-friend Why uses the viewer chart with the server Plus gate',async t=>{
 const send=(serve:ReturnType<typeof handler>,extra:object={})=>serve(new Request('http://localhost/social',{method:'POST',headers:{authorization:'Bearer user-token'},body:JSON.stringify({action:'friend',question:'What lies ahead for Alex?',firstName:'Alex',circle:'circle',member:'member',requestId:'11111111-1111-4111-8111-111111111111',viewerBirthday:birthday,viewerChart:chart,...extra})}));
 for(const plus of [false,true]){
  t.mock.restoreAll();const fake=boundary(t,{plus}),serve=handler(billed);
  const response=await send(serve),result=await response.json();
  assert.equal(response.status,200,JSON.stringify(result));
  assert.equal(result.astrology,astrologyLine(birthday,plus?chart:undefined));
  assert.deepEqual(result.facts,{sun_sign:'leo',activity_themes:'growth'});
  const friendPrompt=fake.prompts.find(p=>p.firstName==='Alex');
  assert.equal(friendPrompt.sun_sign,'leo');
  assert.equal(friendPrompt.viewerChart,undefined);
  const before=fake.prompts.length;
  for(const extra of [{viewerChart:{moonSign:'pluto',risingSign:'virgo'}},{viewerChart:{moonSign:'pisces'}},{viewerBirthday:undefined},{viewerBirthday:'invalid'}])assert.equal((await send(serve,extra)).status,400);
  assert.equal(fake.prompts.length,before);
  const legacy=await (await send(serve,{viewerBirthday:undefined,viewerChart:undefined})).json();
  assert.equal(legacy.astrology,astrologyLine());
 }
});

test('chart weather is a Plus extra read once per month on the server',async t=>{
 const today=new Date().toISOString().slice(0,10),month=new Date(`${today}T12:00:00Z`).toLocaleString('en-US',{month:'long',timeZone:'UTC'});
 const weather=(serve:ReturnType<typeof handler>,extra:object={})=>ask(serve,{action:'chart',viewerChart:chart,localDate:today,...extra});
 let fake=boundary(t,{plus:false});
 const free=await weather(handler(billed));
 assert.equal(free.status,403);assert.equal(fake.weatherCalls(),0);
 t.mock.restoreAll();fake=boundary(t,{plus:true});
 const serve=handler(billed),first=await (await weather(serve)).json();
 assert.equal(first.kind,'ok');assert.match(first.value.text,/Pisces Moon/);
 assert.deepEqual(fake.prompts.at(-1),{month,sunSign:'gemini',...chart});
 const again=await (await weather(serve)).json();
 assert.equal(again.value.text,first.value.text);assert.equal(fake.weatherCalls(),1,'a repeat request reuses the month');
 assert.equal((await weather(serve,{localDate:'2020-01-15'})).status,400,'a far-off device date cannot open another month');
 const changed=await weather(serve,{viewerChart:{moonSign:'leo',risingSign:'virgo'}});
 assert.equal(changed.status,409,'a changed chart waits for next month instead of reusing the old signs');
 assert.equal(fake.weatherCalls(),1);
});

test('chart weather fails closed on stray or generic text and gives the month back',async t=>{
 const today=new Date().toISOString().slice(0,10);
 for(const text of ['Leo energy and your Pisces Moon invite a bright and steady month ahead, full of small brave choices and kind moments.','This month invites a slower and kinder pace. Let small rituals steady you as the days grow shorter and calmer.','Your Gemini Sun invites a slower and kinder pace this month. Let small rituals steady you as the days grow shorter.']){
  t.mock.restoreAll();const fake=boundary(t,{plus:true,weather:[text]});
  const response=await ask(handler(billed),{action:'chart',viewerChart:chart,localDate:today});
  assert.equal(response.status,400);assert.equal(fake.weatherCalls(),2,'one repair, then fail closed');
  assert.deepEqual(fake.rpcs,['claim_chart_weather','release_chart_weather']);assert.equal(fake.stored.size,0);
 }
});

test('a failed save gives the month back for an immediate retry',async t=>{
 const today=new Date().toISOString().slice(0,10);
 let fake=boundary(t,{plus:true,failSave:true});
 assert.equal((await ask(handler(billed),{action:'chart',viewerChart:chart,localDate:today})).status,400);
 assert.deepEqual(fake.rpcs,['claim_chart_weather','save_chart_weather','release_chart_weather']);assert.equal(fake.stored.size,0);
});

test('forgetting birth details drops the birth-derived line from saved readings',()=>{
 const reading={id:'r1',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-10-06T00:00:00Z',label:'Speculative',why:'Practice',facts:{birthday},sources:[],assumptions:[],friend:false,astrology:astrologyLine(birthday,chart)};
 const state={sunSign:'gemini',ageBand:'adult',birthday,ageConfirmed:true,onboardingDone:true,...chart,birthTime:'14:30',birthPlace:'Oslo',facts:{},history:[reading],credits:0,plus:true,usage:{day:'2026-10-06',count:0},reduceMotion:false,largeText:false} as AccountState;
 assert.equal(updateBirthday(state).history[0].astrology,undefined);
 const forgotten=forgetBirthChart(state);
 assert.equal(forgotten.history[0].astrology,undefined);assert.equal(forgotten.moonSign,undefined);assert.equal(forgotten.birthPlace,undefined);assert.equal(forgotten.birthday,birthday);
});

test('chart weather follows the birth chart it came from',()=>{
 const state={sunSign:'gemini',ageBand:'adult',birthday,ageConfirmed:true,onboardingDone:true,...chart,birthTime:'14:30',birthPlace:'Oslo',chartWeather:{month:'2026-10',text:'Steady.'},facts:{},history:[],credits:0,plus:true,usage:{day:'2026-10-06',count:0},reduceMotion:false,largeText:false} as AccountState;
 assert.deepEqual(restoreProfile(state).chartWeather,{month:'2026-10',text:'Steady.'});
 assert.equal(updateBirthday(state,'1996-01-01').chartWeather,undefined);
});

test('the Ball narrates only for unmuted Plus, always with its speculative label',()=>{
 const reading={headline:'You will finish your course next month.',label:'Speculative forecast · not a guarantee'};
 assert.equal(narration({plus:true},reading),'You will finish your course next month. Speculative forecast, not a guarantee.');
 assert.equal(narration({plus:true,narrationMuted:true},reading),null);
 assert.equal(narration({plus:false},reading),null);
});
