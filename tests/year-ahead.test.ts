import test from 'node:test';
import assert from 'node:assert/strict';
import {grantYearly,monthsFrom,openedReading,shelf,type YearAhead} from '../src/year-ahead.ts';
import {planNotifications} from '../src/ritual.ts';
import {handler} from '../server/handler.ts';
import {validatedProvider} from '../server/provider.ts';
import type {Prediction} from '../src/types.ts';

const months=monthsFrom('2026-10-14');
const year:Extract<YearAhead,{kind:'sealed'}>={kind:'sealed',source:'purchase',sealedAt:'2026-10-14T09:00:00.000Z',months:months.map((month,i)=>({month,id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,headline:`You will try a new thing number ${i}.`}))};

test('Year ahead seals twelve months from the local month and opens each on its 1st', () => {
 assert.deepEqual([months[0],months[2],months[11]],['2026-10','2026-12','2027-09']);
 const opened=openedReading(year,year.months[0]);
 assert.equal(opened.dueDate,'2026-11-01');
 assert.equal(openedReading(year,year.months[2]).dueDate,'2027-01-01');
 const states=(history:Prediction[],today:string)=>shelf(year,history,today).map(b=>b.state);
 assert.deepEqual(states([],'2026-10-31').slice(0,2),['ready','sealed']);
 assert.deepEqual(states([opened],'2026-11-01').slice(0,3),['opened','ready','sealed']);
 assert.deepEqual(shelf({kind:'owned',source:'yearly'},[],'2026-10-14'),[]);
});

test('the yearly plan grants Year ahead without replacing a purchase or sealed set', () => {
 assert.deepEqual(grantYearly(undefined),{kind:'owned',source:'yearly'});
 assert.equal(grantYearly(year),year);
});

test('each later month notifies on its 1st, even after daily back-off', () => {
 const plan=planNotifications({history:[],sunSign:null,yearAhead:year},new Date('2026-10-14T10:00:00'),28);
 assert.deepEqual(plan.map(p=>[p.id,p.body]),[['ritual-2026-11-01-year-ahead','Your November ball is open.']]);
 assert.deepEqual(planNotifications({history:[],sunSign:null,yearAhead:{kind:'owned',source:'purchase'}},new Date('2026-10-14T10:00:00'),28),[]);
});

const good=Array.from({length:12},(_,i)=>`You will finish a small ${['clay','song','garden','zine','quilt','map','poem','bake','sketch','hike','letter','puzzle'][i]} project.`);
function serve(outputs:unknown[],env:Record<string,string>={}){
 const seen:string[]=[];
 // The generated-output safety check is a model call too; this fake classifier flags only claims about a secret crush.
 const model=validatedProvider(async messages=>{const last=messages.at(-1)!.content;if(messages[0].content.includes('Classify this generated forecast'))return JSON.stringify({category:/secretly/.test(last)?'person':'allow'});seen.push(last);return JSON.stringify(outputs.shift())});
 return {seen,ask:(headers:Record<string,string>={})=>handler(key=>env[key],model)(new Request('http://localhost/',{method:'POST',headers,body:JSON.stringify({action:'year',question:'Your year ahead',facts:{},localDate:'2026-10-14',viewerBirthday:'1990-03-25'})}))};
}

test('the engine writes twelve validated forecasts keyed by month', async () => {
 const {ask}=serve([{forecasts:good}]);
 const result=await (await ask()).json();
 assert.equal(result.kind,'ok');
 assert.deepEqual(result.value.months.map((m:{month:string})=>m.month),months);
 assert.equal(result.value.months[11].headline,good[11]);
});

test('a month name, hedge or duplicate gets one repair, then fails closed', async () => {
 const bad=[...good];bad[3]='You might visit a lake in March.';bad[7]='You will plant seeds in spring.';bad[5]=bad[4];
 const repaired=serve([{forecasts:bad},{forecasts:good}]);
 assert.equal((await (await repaired.ask()).json()).kind,'ok');
 assert.match(repaired.seen[1],/Forecast 4 must .*drop hedges.*name no number, month, season or date.*Forecast 8 must name no number.*Make every forecast different/);
 const failed=serve([{forecasts:bad},{forecasts:bad}]);
 assert.equal((await (await failed.ask()).json()).kind,'error');
});

test('a forecast about another person\'s feelings gets one repair, then fails closed', async () => {
 const crush=[...good];crush[2]='Your friend will secretly fall in love with you.';
 const repaired=serve([{forecasts:crush},{forecasts:good}]);
 assert.equal((await (await repaired.ask()).json()).kind,'ok');
 assert.match(repaired.seen[1],/Rewrite forecast 3 about the person’s own actions/);
 const failed=serve([{forecasts:crush},{forecasts:crush}]);
 assert.equal((await (await failed.ask()).json()).kind,'error');
});

test('a signed-in engine refuses Year ahead without billing configuration', async () => {
 assert.equal((await serve([{forecasts:good}]).ask({authorization:'Bearer user'})).status,503);
});

for(const entitlement of [undefined,null,'purchase','yearly'] as const)test(`metered Year ahead requires server ownership: ${entitlement}`,async t=>{
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const path=new URL(String(input)).pathname;
  if(path==='/auth/v1/user')return new Headers(init?.headers).get('authorization')==='Bearer user'?Response.json({id:'owner'}):Response.json({},{status:401});
  assert.equal(path,'/rest/v1/rpc/reading_balance');
  assert.deepEqual(JSON.parse(String(init?.body)),{viewer:'owner'});
  return Response.json({owner:'owner',asOf:'2026-10-14T00:00:00.000001Z',plus:false,plusUntil:null,packs:0,used:1,day:'2026-10-14',yearAhead:entitlement});
 });
 const engine=serve([{forecasts:good}],{SUPABASE_URL:'http://localhost:54321',SUPABASE_SERVICE_ROLE_KEY:'test'});
 assert.equal((await engine.ask()).status,401);
 const response=await engine.ask({authorization:'Bearer user'});
 assert.equal(response.status,entitlement?200:403);
 assert.equal(engine.seen.length,entitlement?1:0);
 if(entitlement)assert.equal((await response.json()).value.months.length,12);
});
