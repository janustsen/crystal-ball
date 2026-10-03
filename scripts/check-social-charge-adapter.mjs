import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {allRows} from '../src/social-pagination.ts';
import {settleCircleReading} from '../src/reading-history.ts';
import {once} from 'node:events';

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
 assert.equal(published.charged_at,null);
 const route=`/rest/v1/circle_forecasts?select=id,asker_id,charged_at&id=eq.${published.id}`;
 const [unpaid]=await request(route,token);assert.equal(unpaid.charged_at,null);
 await request('/rest/v1/rpc/mark_circle_charged',token,{forecast:published.id});
 const [paid]=await request(route,token);assert.ok(Number.isFinite(Date.parse(paid.charged_at)));
 await request('/rest/v1/rpc/mark_circle_charged',token,{forecast:published.id});
 const [again]=await request(route,token);assert.equal(again.charged_at,paid.charged_at);

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
  if(path.endsWith('circle_forecasts')){
   const unpaid=result.data.filter(f=>f.charged_at===null);assert.equal(unpaid.length,1);
   let state={onboardingDone:true,ageConfirmed:true,ageBand:'adult',sunSign:null,facts:{},history:[],credits:2,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:1},reduceMotion:false,largeText:false};
   await settleCircleReading(state,unpaid[0],async next=>{state=next},id=>request('/rest/v1/rpc/mark_circle_charged',token,{forecast:id}));
   assert.equal(state.credits,1);assert.equal(state.history.length,0);
  }
 }
 console.log('PASS: adapter caps at 1000; table/RPC pagination recovers all rows and unpaid forecast');
 console.log('PASS: actual adapter projects null and persisted charged_at through HTTP');
}finally{
 if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}
}
