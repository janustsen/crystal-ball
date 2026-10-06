import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../server/handler.ts';
import {astrologyLine,restoreProfile,updateBirthday} from '../src/profile.ts';
import {narration} from '../src/delight.ts';
import type {AccountState} from '../src/types.ts';

const viewer='0f0e0d0c-0b0a-4908-8706-050403020100',birthday='1995-06-15',chart={moonSign:'pisces',risingSign:'virgo'};
const balance=(plus:boolean)=>({owner:viewer,asOf:'2026-10-04T00:00:00.000001Z',plus,plusUntil:plus?'2099-01-01T00:00:00Z':null,packs:0,used:0,day:'2026-10-04'});
const billed=(key:string)=>({SUPABASE_URL:'http://127.0.0.1:55321',SUPABASE_SERVICE_ROLE_KEY:'test-only'} as Record<string,string>)[key];

// Fake Ollama and Supabase boundaries; the weather text is what the model "writes".
function boundary(t:any,{plus=false,weather=['Gemini Sun, Pisces Moon and Virgo rising invite a slower, kinder pace this month. Let small rituals steady you.']}={}){
 const prompts:any[]=[];let weatherCalls=0;
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
  throw new Error(`Unexpected URL: ${url}`);
 });
 return {prompts,weatherCalls:()=>weatherCalls};
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

test('chart weather is a Plus extra that names only the viewer’s signs',async t=>{
 let fake=boundary(t,{plus:false});
 const free=await ask(handler(billed),{action:'chart',viewerChart:chart});
 assert.equal(free.status,403);assert.equal(fake.weatherCalls(),0);
 t.mock.restoreAll();fake=boundary(t,{plus:true});
 const plus=await (await ask(handler(billed),{action:'chart',viewerChart:chart})).json();
 assert.equal(plus.kind,'ok');assert.match(plus.value.text,/Pisces Moon/);
 assert.deepEqual(fake.prompts.at(-1),{month:'October',sunSign:'gemini',...chart});
 t.mock.restoreAll();fake=boundary(t,{plus:true,weather:['Leo energy and your Pisces Moon promise a bright, steady month ahead of you.']});
 const strayed=await ask(handler(billed),{action:'chart',viewerChart:chart});
 assert.equal(strayed.status,400);assert.equal(fake.weatherCalls(),2,'one repair, then fail closed');
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
