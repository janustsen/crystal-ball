import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
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
 console.log('PASS: actual adapter projects null and persisted charged_at through HTTP');
}finally{
 if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}
}
