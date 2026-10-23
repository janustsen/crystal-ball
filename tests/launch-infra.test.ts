import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {appleFixture,nativeToken} from './apple-fixture';
import {appleJwt} from '../server/apple-jwt';
import {deleteAccountHandler} from '../server/delete-account';
import {scheduledHandler} from '../server/scheduled';
import {apnsSender} from '../server/social-push';
import {research} from '../server/research';
import {createPublicKey,verify} from 'node:crypto';
const settings={...appleFixture,SUPABASE_URL:'https://db.invalid',SUPABASE_SERVICE_ROLE_KEY:'service-only'};
const env=(key:string)=>(settings as Record<string,string>)[key];
const user='00000000-0000-0000-0000-000000000001';

test('News is disabled before any outbound request',async t=>{
 t.mock.method(globalThis,'fetch',async()=>assert.fail('No News request may leave the server'));
 assert.deepEqual(await research('world economy'),[]);
});

test('Apple JWT is an ES256 signature verifiable with its public key',async()=>{
 const token=await appleJwt(env,'APNS',{iss:'team',iat:123}),[header,body,signature]=token.split('.');
 assert.deepEqual(JSON.parse(Buffer.from(header,'base64url').toString()),{alg:'ES256',kid:'fixture-key'});
 assert.equal(verify('sha256',Buffer.from(`${header}.${body}`),{key:createPublicKey(appleFixture.APNS_PRIVATE_KEY),dsaEncoding:'ieee-p1363'},Buffer.from(signature,'base64url')),true);
});

test('APNs sends the original generic payload directly with Apple credentials',async()=>{
 let sent=false;
 const send=await apnsSender(env,async(input,init)=>{
  sent=true;assert.equal(input,`https://api.sandbox.push.apple.com/3/device/${nativeToken}`);
  const h=new Headers(init?.headers);assert.equal(h.get('apns-topic'),'com.janustsen.crystalball');assert.equal(h.get('apns-push-type'),'alert');assert.match(h.get('authorization')!,/^bearer /);
  assert.deepEqual(JSON.parse(String(init?.body)),{aps:{alert:{title:'Crystal Ball',body:'The Sky is open.'},sound:'default'},body:{social:true,sky:true}});
  return new Response(null,{status:200});
 });
 assert.equal(await send({to:nativeToken,title:'Crystal Ball',body:'The Sky is open.',sound:'default',data:{social:true,sky:true}}),true);assert.equal(sent,true);
});

test('scheduler rejects missing, ordinary-user and wrong secrets before touching any service',async()=>{
 for(const job of ['sky','push'] as const){
  const handle=scheduledHandler(key=>key==='SCHEDULER_SECRET'?'cron-only':undefined,job);
  for(const authorization of ['', 'Bearer anon-session','Bearer wrong'])assert.equal((await handle(new Request('https://local',{method:'POST',headers:{authorization}}))).status,401);
  assert.equal((await handle(new Request('https://local'))).status,405);
 }
});

test('deletion checks account ownership, revokes Apple, then hard-deletes only that account',async()=>{
 const calls:string[]=[];let sub='apple-owner',revokes=true,deleted=true;
 const handle=deleteAccountHandler(env,async(input,init)=>{
  const url=String(input);calls.push(url);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:user,identities:[{provider:'apple',identity_data:{sub:'apple-owner'}}]});
  if(url.endsWith('/auth/token')){
   const params=new URLSearchParams(String(init?.body));assert.equal(params.get('code'),'fresh-code');assert.equal(params.get('client_id'),appleFixture.APPLE_CLIENT_ID);
   const payload={sub,aud:appleFixture.APPLE_CLIENT_ID,iss:'https://appleid.apple.com',exp:Math.floor(Date.now()/1000)+300};
   return Response.json({refresh_token:'apple-refresh-only',id_token:`x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.x`});
  }
  if(url.endsWith('/auth/revoke')){assert.equal(new URLSearchParams(String(init?.body)).get('token'),'apple-refresh-only');return new Response(null,{status:revokes?200:500});}
  assert.equal(url,`https://db.invalid/auth/v1/admin/users/${user}`);assert.equal(init?.method,'DELETE');assert.deepEqual(JSON.parse(String(init?.body)),{should_soft_delete:false});
  return new Response(null,{status:deleted?200:500});
 });
 const request=(headers:Record<string,string>={authorization:'Bearer user-session'})=>new Request('https://local',{method:'POST',headers,body:JSON.stringify({authorizationCode:'fresh-code',user_id:'victim'})});
 assert.equal((await handle(request({}))).status,401);assert.equal(calls.length,0);
 sub='other-apple-account';assert.equal((await handle(request())).status,403);assert.equal(calls.some(c=>c.includes('/admin/')),false);
 calls.length=0;sub='apple-owner';revokes=false;assert.equal((await handle(request())).status,502);assert.equal(calls.some(c=>c.includes('/admin/')),false);
 calls.length=0;revokes=true;deleted=false;assert.equal((await handle(request())).status,502);
 calls.length=0;deleted=true;const result=await handle(request());assert.equal(result.status,200);assert.deepEqual(await result.json(),{deleted:true});assert.deepEqual(calls.map(c=>new URL(c).pathname),['/auth/v1/user','/auth/token','/auth/revoke',`/auth/v1/admin/users/${user}`]);
});

test('release config rejects private endpoints and preview credentials',()=>{
 const config=createRequire(import.meta.url)('../app.config.js'),before={...process.env};
 try{
  process.env.CRYSTAL_BALL_RELEASE='true';process.env.EXPO_PUBLIC_SUPABASE_URL='https://launch-test.supabase.co';process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY='public';process.env.EXPO_PUBLIC_AI_PROVIDER_NAME='DeepInfra';process.env.EXPO_PUBLIC_WEB_ORIGIN='https://crystalball.janustsen.com';delete process.env.EXPO_PUBLIC_PREVIEW_SECRET;
  for(const url of ['','http://127.0.0.1:8787','http://mac.tail.ts.net:8087/engine','https://another.example/engine']){process.env.EXPO_PUBLIC_ENGINE_URL=url;assert.throws(()=>config({config:{}}),/Supabase predict/);}
  process.env.EXPO_PUBLIC_ENGINE_URL='https://launch-test.supabase.co/functions/v1/predict';assert.deepEqual(config({config:{name:'Crystal Ball'}}),{name:'Crystal Ball'});
  process.env.EXPO_PUBLIC_PREVIEW_SECRET='preview-only';assert.throws(()=>config({config:{}}),/preview secret/);
 }finally{process.env=before;}
});

test('production-mode preview config stays available without the explicit release flag',()=>{
 const config=createRequire(import.meta.url)('../app.config.js'),before={...process.env};
 try{
  delete process.env.CRYSTAL_BALL_RELEASE;delete process.env.EXPO_PUBLIC_SUPABASE_URL;delete process.env.EXPO_PUBLIC_ENGINE_URL;
  process.env.NODE_ENV='production';
  assert.deepEqual(config({config:{name:'preview'}}),{name:'preview'});
  process.env.CRYSTAL_BALL_RELEASE='true';assert.throws(()=>config({config:{}}),/Release requires EXPO_PUBLIC_SUPABASE_URL/);
 }finally{process.env=before;}
});
