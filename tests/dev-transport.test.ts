import {serverRpcs,type ServerRpc} from '../server/rpc.ts';
import {asks} from '../src/ball-asks.ts';
import {socialHandler} from '../server/social.ts';
import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readdir} from 'node:fs/promises';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';
import {billing} from '../server/billing.ts';
import {deliverSocialPushes,serviceRpc} from '../server/social-push.ts';
import {openSky} from '../server/sky.ts';
import {webReadings} from '../server/web-reading.ts';
import {solveProof} from '../src/web-reading.ts';
import type {ModelProvider,JsonSchema} from '../server/provider.ts';
import {once} from 'node:events';
import {join} from 'node:path';

async function startAdapter(t:TestContext,psql:string,env:Partial<NodeJS.ProcessEnv>={}){
 const directory=await mkdtemp(join(process.cwd(),'.dev-transport-test-'));
 await writeFile(join(directory,'psql'),`#!/usr/bin/env node\n${psql}`,{mode:0o700});
 const child=spawn(process.execPath,['scripts/social-dev-transport.mjs'],{
  env:{...process.env,...env,PG_BIN:directory,SOCIAL_DB_PORT:'0'},
  stdio:['ignore','pipe','pipe'],
 });
 let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk});
 t.after(async()=>{
  if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited}
  await rm(directory,{recursive:true,force:true});
 });
 const [startup]=await Promise.race([
  once(child.stdout,'data',{signal:AbortSignal.timeout(5000)}),
  once(child,'exit').then(([code])=>{throw Error(`Adapter exited (${code}): ${stderr}`)}),
 ]);
 const base=String(startup).match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
 assert.ok(base,'adapter announces its listening address');
 return {base,directory};
}
const serviceCall=(base:string,name:string,body:object)=>fetch(`${base}/rest/v1/rpc/${name}`,{
 method:'POST',headers:{Authorization:'Bearer verification-service-only','Content-Type':'application/json'},
 body:JSON.stringify(body),signal:AbortSignal.timeout(3000),
});

test('dev transport executes web-reading RPCs through HTTP', {timeout:15000}, async t=>{
 const {base,directory}=await startAdapter(t,`const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const fixture=JSON.parse(readFileSync(__dirname+'/fixture.json','utf8'));
assert.deepEqual(process.argv.slice(2),['-X','-At','-v','ON_ERROR_STOP=1','-c',fixture.sql]);
if(fixture.error){console.error('ERROR: '+fixture.error);process.exit(1)}
console.log('BEGIN\\nSET\\n'+JSON.stringify(fixture.result)+'\\nCOMMIT');
`);
 const fixture=join(directory,'fixture.json');
 const browser='11111111-1111-4111-8111-111111111111',network="network'key";
 const day='2026-10-06',expires_at='2026-10-06T12:10:00+00:00';
 const claim={browser,network,daily_cap:500},reservation={browser,network,day,expires_at};
 const identity=`browser => '${browser}',network => 'network''key'`;
 const lease=`${identity},day => '${day}',expires_at => '${expires_at}'`;
 const cases=[
  {name:'claim_web_reading',body:claim,args:`${identity},daily_cap => '500'`,result:{outcome:'ok',day,expires_at}},
  {name:'claim_web_reading',body:claim,args:`${identity},daily_cap => '500'`,result:{outcome:'browser',day}},
  {name:'complete_web_reading',body:reservation,args:lease,result:true},
  {name:'complete_web_reading',body:reservation,args:lease,result:false},
  {name:'release_web_reading',body:reservation,args:lease,result:null},
  {name:'claim_web_reading',body:claim,args:`${identity},daily_cap => '500'`,result:null,error:'database unavailable'},
 ];
 for(const entry of cases){
  await writeFile(fixture,JSON.stringify({
   sql:`begin; set local role service_role; select coalesce(to_jsonb(public.${entry.name}(${entry.args})),'null'::jsonb); commit;`,
   result:entry.result,error:entry.error,
  }));
  const response=await serviceCall(base,entry.name,entry.body);
  const result=await response.json();
  assert.equal(response.status,entry.error?400:200,`${entry.name}: ${JSON.stringify(result)}`);
  assert.deepEqual(result,entry.error?{message:entry.error,code:'verification'}:entry.result);
 }
});

test('dev transport dispatches every registered server RPC', {timeout:30000}, async t=>{
 const {base}=await startAdapter(t,"console.log('BEGIN\\nSET\\ntrue\\nCOMMIT');");
 const rpc=serviceRpc(key=>({SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:'verification-service-only'} as Record<string,string>)[key]);
 for(const name of Object.keys(serverRpcs) as ServerRpc[]){
  assert.equal(await rpc(name,{}),true,`${name} reaches the database`);
 }
 assert.equal((await serviceCall(base,'unregistered_rpc',{})).status,400);
});

const exec=promisify(execFile);

test('engine RPC operations work through the dev adapter and PostgreSQL', {timeout:60000}, async t=>{
 const pg=(command:string)=>process.env.PG_BIN?join(process.env.PG_BIN,command):command;
 const directory=await mkdtemp(join(process.cwd(),'.dev-transport-db-'));
 let started=false;
 t.after(async()=>{
  if(started)await exec(pg('pg_ctl'),['-D',join(directory,'data'),'-m','immediate','-w','stop']);
  await rm(directory,{recursive:true,force:true});
 });
 const password=randomUUID();
 await writeFile(join(directory,'password'),password,{mode:0o600});
 await exec(pg('initdb'),['-D',join(directory,'data'),'-U','transport_test','-A','scram-sha-256','--pwfile='+join(directory,'password'),'--no-locale','-E','UTF8']);
 const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');
 const port=(listener.address() as {port:number}).port;
 await new Promise<void>((resolve,reject)=>listener.close(error=>error?reject(error):resolve()));
 await exec(pg('pg_ctl'),['-D',join(directory,'data'),'-l',join(directory,'server.log'),'-o',`-p ${port} -c unix_socket_directories='' -c listen_addresses='127.0.0.1' -c timezone=UTC`,'-w','start']);
 started=true;
 const env={...process.env,PGHOST:'127.0.0.1',PGPORT:String(port),PGDATABASE:'postgres',PGUSER:'transport_test',PGPASSWORD:password};
 const sql=async(statement:string)=>(await exec(pg('psql'),['-X','-At','-v','ON_ERROR_STOP=1','-c',statement],{env})).stdout.trim();
 await sql(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
 for(const file of (await readdir('supabase/migrations')).sort()){
  await exec(pg('psql'),['-X','-v','ON_ERROR_STOP=1','-f',join('supabase/migrations',file)],{env});
 }
 const {base}=await startAdapter(t,`const {spawnSync}=require('node:child_process');
const result=spawnSync(${JSON.stringify(pg('psql'))},process.argv.slice(2),{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);`,env);
 const settings=(key:string)=>({SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:'verification-service-only',SOCIAL_MOCK_ENTITLEMENTS:'true'} as Record<string,string>)[key];
 const signup=await fetch(`${base}/auth/v1/signup`,{method:'POST',body:'{}'});
 assert.equal(signup.status,200);
 const session=await signup.json(),viewer=session.user.id;
 const meter=billing(settings)!;
 assert.equal(await meter.user(new Request(base,{headers:{authorization:`Bearer ${session.access_token}`}})),viewer);
 assert.equal((await meter.balance(viewer)).plus,false);
 assert.equal((await meter.simulate(viewer,'monthly')).plus,true);
 assert.equal((await meter.balance(viewer)).yearAhead,null);
 assert.equal((await meter.simulate(viewer,'annual')).yearAhead,'yearly');
 assert.equal((await meter.balance(viewer)).yearAhead,'yearly');
 const buyer=randomUUID();await sql(`insert into auth.users values('${buyer}')`);
 assert.equal((await meter.simulate(buyer,'yearAhead')).yearAhead,'purchase');
 assert.equal((await meter.simulate(buyer,'off')).yearAhead,'purchase');
 assert.equal((await meter.balance(buyer)).plus,false);
 assert.equal((await meter.styles(viewer,'classic','classic')).plus,true);
 const reading=await meter.authorizeCharge(viewer,randomUUID(),{question:'Will I learn?',friend:false});
 assert.equal((await meter.charge(viewer,reading)).used,1);
 // The Ball asks bonus: one per 25 distinct bank answers, each credited once however often it is claimed.
 await assert.rejects(meter.askBonus(viewer,['not_a_question']),/The Ball asks/);
 const answered=asks.slice(0,50).map(ask=>ask.id);
 assert.equal((await meter.askBonus(viewer,answered.slice(0,24))).packs,0);
 assert.equal((await meter.askBonus(viewer,[...answered.slice(0,25),...answered.slice(0,25)])).packs,1);
 assert.equal((await meter.askBonus(viewer,answered)).packs,2);
 assert.equal((await meter.askBonus(viewer,answered)).packs,2);

 const weather="Gemini's skies invite a slower pace.";
 let generated=0;
 const generate=async()=>{generated++;return weather};
 assert.equal(await meter.chartWeather(viewer,'2026-10','gemini/pisces/virgo',generate),weather);
 assert.equal(await meter.chartWeather(viewer,'2026-10','gemini/pisces/virgo',generate),weather);
 assert.equal(generated,1);
 await assert.rejects(meter.chartWeather(viewer,'2026-11','gemini',async()=>{throw Error('generation failed')}),/generation failed/);
 assert.equal(await sql("select count(*) from public.chart_weather where month='2026-11'"),'0');
 assert.equal(await meter.chartWeather(viewer,'2026-11','gemini',generate),weather);

 const web=webReadings(settings),proof=await solveProof(randomUUID()),request=new Request(base,{headers:{'x-forwarded-for':'192.0.2.1'}});
 const claim=await web.claim(request,proof);
 await web.release(claim);
 const retry=await web.claim(request,proof);
 await web.complete(retry);
 await assert.rejects(web.claim(request,proof),/free web reading is used/);

 const sent:Record<string,unknown>[]=[];
 const transport:typeof fetch=async(input,init)=>{
  if(String(input)==='https://exp.host/--/api/v2/push/send'){
   sent.push(JSON.parse(String(init?.body)));
   return Response.json({data:{status:'ok'}});
  }
  return fetch(input,init);
 };
 assert.deepEqual(await deliverSocialPushes(settings,transport),{queued:0,accepted:0});
 const circle=randomUUID();
 await sql(`insert into public.circles(id,owner_id) values('${circle}','${viewer}');
 insert into public.circle_members(circle_id,user_id) values('${circle}','${viewer}');`);
 const model:ModelProvider={async json<T>(_system:string,_input:unknown,schema:JsonSchema){
  const fields=schema.properties as Record<string,unknown>;
  return ('safe' in fields?{safe:true}:'category' in fields?{category:'allow'}:'headline' in fields?{headline:'A creative skill may bring a brighter chapter.',why:'Only a sun sign and shared activity themes are known.'}:{text:'A bright shared spark gathers over all of you tonight.'}) as T;
 }};
 const social=socialHandler(settings,model,meter);
 const socialRequest=(body:object)=>social(new Request(`${base}/social`,{method:'POST',headers:{authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)}));
 const profile=await socialRequest({action:'profile',ageBand:'adult',sunSign:'gemini'});
 assert.equal(profile.status,200);
 assert.deepEqual(await profile.json(),{ok:true});
 assert.equal(await sql(`select age_band||'/'||sun_sign from public.social_profiles where user_id='${viewer}'`),'adult/gemini');
 const member=randomUUID();
 await sql(`insert into auth.users values('${member}');
 insert into public.social_profiles(user_id,age_band,sun_sign,friends_can_ask) values('${member}','adult','leo',true);
 insert into public.circle_members(circle_id,user_id,theme) values('${circle}','${member}','growth');`);
 const friendBody={action:'friend',question:'What lies ahead for Alex?',firstName:'Alex',circle,member,requestId:randomUUID()};
 const friend=await socialRequest(friendBody),prediction=await friend.json();
 assert.equal(friend.status,200,JSON.stringify(prediction));
 assert.equal(prediction.headline,'A creative skill may bring a brighter chapter.');
 assert.deepEqual(prediction.facts,{sun_sign:'leo',activity_themes:'growth'});
 assert.deepEqual(prediction.friendTarget,{circle,member,firstName:'Alex'});
 assert.equal(await sql(`select count(*) from public.friend_notices where user_id='${member}'`),'1');
 await sql(`update public.social_profiles set friends_can_ask=false where user_id='${member}'`);
 const refused=await socialRequest({...friendBody,requestId:randomUUID()});
 assert.equal(refused.status,400);
 assert.deepEqual(await refused.json(),{message:'This friend has not enabled friend readings'});
 assert.deepEqual(await openSky(settings,model,new Date('2026-10-09T12:00Z')),{week:'2026-10-09',targets:1,opened:1});
 assert.deepEqual(await openSky(settings,model,new Date('2026-10-09T12:00Z')),{week:'2026-10-09',targets:0,opened:0});
 const token='ExpoPushToken[transport]';
 const registered=await fetch(`${base}/rest/v1/rpc/set_social_push`,{method:'POST',headers:{authorization:`Bearer ${session.access_token}`},body:JSON.stringify({push_token:token})});
 assert.equal(registered.status,200);
 await sql(`update public.social_profiles set sky_push=true,time_zone='SKY'||(extract(epoch from ((now() at time zone 'UTC')-(date_trunc('week',now() at time zone 'UTC')+interval '4 days 20 hours 30 minutes')))/3600)::int::text where user_id='${viewer}';
 delete from public.sky_omens;
 insert into public.sky_omens(week,circle_id,omen) select (now() at time zone time_zone)::date,'${circle}','A bright shared spark gathers over all of you tonight.' from public.social_profiles where user_id='${viewer}';`);
 assert.deepEqual(await deliverSocialPushes(settings,transport),{queued:2,accepted:2});
 assert.deepEqual(sent.map(push=>push.data),[{social:true,circle},{social:true,sky:true}]);
 assert.deepEqual(sent.map(push=>push.to),[token,token]);
 assert.equal(await sql('select count(*) from public.social_notifications where delivered_at is not null'),'1');
 assert.equal(await sql('select count(*) from public.sky_pushes where delivered_at is not null'),'1');
 assert.deepEqual(await deliverSocialPushes(settings,transport),{queued:0,accepted:0});
});
