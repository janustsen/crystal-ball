import test from 'node:test';
import assert from 'node:assert/strict';
import {socialHandler} from '../server/social';
import {deliverSocialPushes} from '../server/social-push';
import type {ModelProvider,JsonSchema} from '../server/provider';

test('Circle question and forecast both pass teen moderation before a service receipt exists',async t=>{
 let saved=0,member=true,allow=true;
 const audiences:boolean[]=[];
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=String(input);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'viewer'});
  if(url.includes('/social_profiles?'))return Response.json([{age_band:'adult'}]);
  if(url.includes('/circle_members?'))return Response.json(member?[{user_id:'viewer'}]:[]);
  if(url.endsWith('/circle_forecast_drafts')){saved++;return Response.json([{id:'receipt',...JSON.parse(String(init?.body))}]);}
  throw new Error(`Unexpected URL ${url}`);
 });
 const model:ModelProvider={async json<T>(_system:string,input:unknown,schema:JsonSchema){
  const properties=schema.properties as Record<string,unknown>;
  if('safe'in properties){audiences.push((input as {teenAudience:boolean}).teenAudience);return {safe:allow} as T;}
  if('headline'in properties)return {headline:'A shared creative project may bring a bright chapter.',days:14} as T;
  return {category:'allow'} as T;
 }};
 const env=(key:string)=>({SUPABASE_URL:'http://db.local',SUPABASE_SERVICE_ROLE_KEY:'fixture'}[key]);
 const request=()=>new Request('http://local/social',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({action:'circle',circle:'00000000-0000-0000-0000-000000000001',question:'Will we learn a skill together?'})});
 const handle=socialHandler(env,model);
 assert.equal((await handle(request())).status,200);assert.equal(saved,1);assert.deepEqual(audiences,[true,true]);
 allow=false;assert.equal((await handle(request())).status,400);assert.equal(saved,1);
 member=false;const before=audiences.length;assert.equal((await handle(request())).status,400);assert.equal(audiences.length,before);
});

test('push worker sends only permitted generic messages and acknowledges accepted jobs',async()=>{
 const sent:Record<string,unknown>[]=[],finished:string[]=[];
 const env=(key:string)=>({SUPABASE_URL:'http://db.local',SUPABASE_SERVICE_ROLE_KEY:'fixture'}[key]);
 const transport:typeof fetch=async(input,init)=>{
  const url=String(input),body=JSON.parse(String(init?.body));
  if(url.endsWith('/claim_social_pushes'))return Response.json(['seal','invite','joined','forecast','vote'].map((kind,index)=>({id:String(index),kind,token:'ExpoPushToken[fixture]',circle_id:'circle'})));
  if(url.endsWith('/finish_social_push')){finished.push(body.notification);return Response.json(null);}
  assert.equal(url,'https://exp.host/--/api/v2/push/send');sent.push(body);return Response.json({data:{status:'ok',id:'ticket'}});
 };
 assert.deepEqual(await deliverSocialPushes(env,transport),{queued:5,accepted:5});
 assert.equal(sent.length,5);assert.equal(finished.length,5);
 assert.ok(sent.every(s=>!JSON.stringify(s).includes('question')));
});

test('failed push delivery remains retryable and never acknowledges a rejected ticket',async()=>{
 let finished=false;
 const transport:typeof fetch=async(input)=>{
  const url=String(input);
  if(url.endsWith('claim_social_pushes'))return Response.json([{id:'job',kind:'invite',token:'ExpoPushToken[fixture]',circle_id:'circle'}]);
  if(url.endsWith('finish_social_push')){finished=true;return Response.json(null);}
  return Response.json({data:{status:'error',details:{error:'MessageRateExceeded'}}});
 };
 const result=await deliverSocialPushes(key=>({SUPABASE_URL:'http://db.local',SUPABASE_SERVICE_ROLE_KEY:'fixture'}[key]),transport);
 assert.deepEqual(result,{queued:1,accepted:0});assert.equal(finished,false);
});
