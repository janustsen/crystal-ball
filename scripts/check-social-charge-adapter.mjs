import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {allRows} from '../src/social-pagination.ts';
import {once} from 'node:events';
import {validBalance} from '../src/billing.ts';

const child=spawn(process.execPath,['scripts/social-dev-transport.mjs'],{env:process.env,stdio:['ignore','pipe','inherit']});
try{
 await Promise.race([
  once(child.stdout,'data'),
  once(child,'exit').then(([code])=>{throw Error(`Adapter exited: ${code}`)}),
  new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Adapter startup timed out')),10000);timer.unref()}),
 ]);
 const base=`http://127.0.0.1:${process.env.SOCIAL_DB_PORT||55329}`;
 async function request(path,token,body){
  const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;
 }
 const session=await request('/auth/v1/signup',null,{}),token=session.access_token;
 const circle=await request('/rest/v1/rpc/create_circle',token,{});
 const [draft]=await request('/rest/v1/circle_forecast_drafts','verification-service-only',{user_id:session.user.id,circle_id:circle,question:'Will we learn together?',headline:'A shared skill awaits.',due_date:new Date(Date.now()+86400000*2).toISOString().slice(0,10)});
 const published=await request('/rest/v1/rpc/publish_circle_forecast',token,{approved_draft:draft.id});
 assert.ok(Number.isFinite(Date.parse(published.charged_at)));
 const route=`/rest/v1/circle_forecasts?select=id,asker_id,charged_at&id=eq.${published.id}`;
 const [paid]=await request(route,token);assert.equal(paid.charged_at,published.charged_at);
 const again=await request('/rest/v1/rpc/publish_circle_forecast',token,{approved_draft:draft.id});assert.equal(again.charged_at,paid.charged_at);
 const balance=await request('/rest/v1/rpc/reading_balance','verification-service-only',{viewer:session.user.id});
 assert.equal(balance.used,1);assert.equal(balance.owner,session.user.id);assert.match(balance.asOf,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
 const granted=await request('/rest/v1/rpc/apply_store_entitlements','verification-service-only',{viewer:session.user.id,entitled_until:null,purchases:[{id:'retry-pack',readings:5}]});
 assert.ok(validBalance(granted));assert.equal(granted.owner,session.user.id);assert.ok(granted.asOf>balance.asOf);
 const reading='ask:11111111-1111-4111-8111-111111111111';
 const lookup=`/rest/v1/reading_charges?user_id=eq.${session.user.id}&reading_id=eq.${reading}&select=reading_id`;
 assert.deepEqual(await request(lookup,'verification-service-only'),[]);
 const first=await request('/rest/v1/rpc/charge_reading','verification-service-only',{viewer:session.user.id,reading});
 const retry=await request('/rest/v1/rpc/charge_reading','verification-service-only',{viewer:session.user.id,reading});
 assert.ok(validBalance(balance));assert.ok(validBalance(first));assert.ok(validBalance(retry));assert.ok(first.asOf>granted.asOf);
 assert.equal(first.packs,4);assert.equal(first.owner,session.user.id);assert.ok(retry.asOf>first.asOf);
 assert.deepEqual({...retry,asOf:first.asOf},first);
 assert.equal((await request(lookup,'verification-service-only')).length,1);
 assert.deepEqual(await request(lookup.replace(reading,'ask:22222222-2222-4222-8222-222222222222'),'verification-service-only'),[]);
 console.log('PASS: retrying an ask spends one pack reading and is discoverable by its key');

 execFileSync(`${process.env.PG_BIN}/psql`,['-X','-v','ON_ERROR_STOP=1','-c',`
 insert into public.circle_forecast_drafts(id,user_id,circle_id,question,headline,due_date)
 select ('ffffffff-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'${session.user.id}','${circle}','Will we learn together?','A shared skill awaits.',current_date+2 from generate_series(1,1010) i;
 insert into public.circle_forecasts(id,asker_id,circle_id,question,headline,due_date,charged_at)
 select id,user_id,circle_id,question,headline,due_date,case when id='ffffffff-0000-0000-0000-000000001010' then null else now() end from public.circle_forecast_drafts where id::text like 'ffffffff-%';
 insert into public.circle_glows(circle_id,day) select '${circle}',current_date-i from generate_series(0,1009) i;
 `],{stdio:'pipe'});
 for(const [path,order,body,expected] of [
  ['/rest/v1/circle_forecasts','id.asc',undefined,1011],
  ['/rest/v1/circle_glows','circle_id.asc,day.asc',undefined,1010],
  ['/rest/v1/rpc/circle_vote_tallies','forecast_id.asc',{},1011],
 ]){
  assert.equal((await request(`${path}?order=${order}`,token,body)).length,1000);
  const result=await allRows(async(from,to)=>({data:await request(`${path}?order=${order}&offset=${from}&limit=${to-from+1}`,token,body),error:null}));
  assert.equal(result.data.length,expected);
  if(path.endsWith('circle_forecasts'))assert.equal(result.data.filter(f=>f.charged_at===null).length,1);
 }
 console.log('PASS: adapter caps at 1000; table/RPC pagination recovers all rows');
 console.log('PASS: publication through HTTP is charged once by the server ledger');
}finally{
 if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}
}
