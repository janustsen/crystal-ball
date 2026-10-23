import {appleJwt} from './apple-jwt.ts';
type Env=(key:string)=>string|undefined;
// The code is exchanged server-side and its Apple subject must match the authenticated account.
export function deleteAccountHandler(env:Env,transport:typeof fetch=fetch){
 return async(request:Request)=>{
  const headers={'Access-Control-Allow-Origin':env('APP_ORIGIN')||'https://crystalball.janustsen.com','Access-Control-Allow-Headers':'content-type, authorization, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
  const refuse=(error:string,status:number)=>reply({error,refused:true},status);
  if(request.method==='OPTIONS')return new Response(null,{headers});
  if(request.method!=='POST')return refuse('Use POST.',405);
  try{
   const base=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY'),client=env('APPLE_CLIENT_ID'),team=env('APPLE_TEAM_ID');
   if(!base||!key||!client||!team||!env('APPLE_KEY_ID')||!env('APPLE_PRIVATE_KEY'))return refuse('Account deletion is not configured yet.',503);
   const authorization=request.headers.get('authorization');
   if(!authorization?.startsWith('Bearer '))return refuse('Sign in first.',401);
   const identity=await transport(`${base}/auth/v1/user`,{headers:{apikey:key,authorization},signal:AbortSignal.timeout(10000)});
   if(!identity.ok)return refuse('Your session expired. Sign in again.',401);
   const user=await identity.json(),apple=user.identities?.find((i:{provider:string})=>i.provider==='apple');
   const subject=apple?.identity_data?.sub;
   if(typeof user.id!=='string'||!/^[a-f0-9-]{36}$/i.test(user.id)||typeof subject!=='string')return refuse('Use your linked Apple account.',403);
   const raw=await request.text();if(raw.length>5000)return refuse('Request too large.',413);
   const {authorizationCode}=JSON.parse(raw);
   if(typeof authorizationCode!=='string'||authorizationCode.length<1||authorizationCode.length>2048)return refuse('Confirm with Apple to delete your account.',400);
   const now=Math.floor(Date.now()/1000),secret=await appleJwt(env,'APPLE',{iss:team,iat:now,exp:now+300,aud:'https://appleid.apple.com',sub:client});
   const applePost=(route:string,body:Record<string,string>)=>transport(`https://appleid.apple.com/auth/${route}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:client,client_secret:secret,...body}),signal:AbortSignal.timeout(15000)});
   const exchange=await applePost('token',{code:authorizationCode,grant_type:'authorization_code'});
   if(!exchange.ok)return refuse('Apple confirmation expired. Please try again.',400);
   const tokens=await exchange.json();
   // This ID token comes directly from Apple's authenticated HTTPS token exchange, never from the app.
   const claims=JSON.parse(atob(tokens.id_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
   if(claims.sub!==subject||claims.aud!==client||claims.iss!=='https://appleid.apple.com'||!Number.isFinite(claims.exp)||claims.exp<=now||typeof tokens.refresh_token!=='string'||!tokens.refresh_token)return refuse('Confirm with the Apple account linked to this backup.',403);
   const revoked=await applePost('revoke',{token:tokens.refresh_token,token_type_hint:'refresh_token'});
   if(!revoked.ok)return refuse('Apple access could not be revoked. Your account has not been deleted. Try again.',502);
   const removed=await transport(`${base}/auth/v1/admin/users/${user.id}`,{method:'DELETE',headers:{apikey:key,authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({should_soft_delete:false}),signal:AbortSignal.timeout(15000)});
   if(!removed.ok)return reply({error:'Apple access was revoked, but deletion did not finish. Please retry or contact support.'},502);
   return reply({deleted:true});
  }catch{return reply({error:'Account deletion did not finish. Please retry or contact support.'},503);}
 };
}
