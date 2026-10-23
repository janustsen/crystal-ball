import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {createContext,SourceTextModule,SyntheticModule} from 'node:vm';

async function load(file,imports,globals={}){
 const context=createContext({console,Date,AbortSignal,Response,Request,URLSearchParams,atob,...globals});
 const module=new SourceTextModule(stripTypeScriptTypes(readFileSync(new URL(file,import.meta.url),'utf8')),{context});
 await module.link(name=>{
  const values=imports[name];
  if(!values)throw Error(`Missing fixture: ${name}`);
  return new SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value)},{context});
 });
 await module.evaluate();return module.namespace;
}

test('real iOS helper propagates synchronous and asynchronous cleanup failures, retries, and preserves best-effort updates',async()=>{
 let failure='sync',calls=0;
 const constants={appOwnership:'standalone'};
 const widget={updateTimeline(){calls++;if(failure==='sync')throw Error('native sync failure');if(failure==='async')return Promise.reject(Error('native async failure'));return Promise.resolve()}};
 const api=await load('../src/omen-widget.ios.ts',{'expo-constants':{default:constants},'./retention':{currentOmen:value=>value}},{require:()=>({default:widget})});
 for(const mode of ['sync','async']){
  failure=mode;
  await api.updateOmenWidget(null);
  await assert.rejects(api.updateOmenWidget(null,true),/native/);
 }
 failure=null;
 await api.updateOmenWidget(null,true);
 assert.equal(calls,5);
 await api.updateOmenWidget(null);
 assert.equal(calls,5);
 failure='async';await assert.rejects(api.updateOmenWidget(null,true),/native/);
 constants.appOwnership='expo';await api.updateOmenWidget(null,true);
 assert.equal(calls,6);
});

test('cloud distinguishes explicit refusal from transport, parsing, server uncertainty and sign-out failures',async()=>{
 let response=()=>Response.json({deleted:true}),signOutError=null;
 const client={auth:{getSession:async()=>({data:{session:{access_token:'token',user:{id:'owner'}}}}),getUser:async()=>({error:null}),signOut:async()=>({error:signOutError})}};
 const api=await load('../src/cloud.ts',{
  '@supabase/supabase-js':{createClient:()=>client,isAuthRetryableFetchError:()=>false,isAuthSessionMissingError:()=>false},
  '@react-native-async-storage/async-storage':{default:{}},'./profile':{canRead:()=>true},'./ladder':{questionsAsked:()=>0},'./backup':{validFacts:()=>true,validPrediction:()=>true},'./ball-asks':{askFor:()=>{},asksOf:()=>{},selfAnswers:()=>{},teenSafe:()=>true},
 },{process:{env:{EXPO_PUBLIC_SUPABASE_URL:'https://example.invalid',EXPO_PUBLIC_SUPABASE_ANON_KEY:'public'}},fetch:async()=>response()});
 response=()=>Response.json({error:'refused',refused:true},{status:403});
 await assert.rejects(api.deleteAppleAccount('code'),error=>error instanceof api.AccountDeletionRefused);
 for(const result of [()=>{throw Error('response lost')},()=>new Response('broken json'),()=>Response.json({error:'admin result unknown'},{status:502})]){
  response=result;
  await assert.rejects(api.deleteAppleAccount('code'),error=>!(error instanceof api.AccountDeletionRefused));
 }
 response=()=>Response.json({deleted:true});signOutError=Error('sign-out failed');
 await assert.rejects(api.deleteAppleAccount('code'),error=>error===signOutError);
 signOutError=null;await api.deleteAppleAccount('code');
});

test('server marks only refusals before admin deletion as definite',async()=>{
 let mode='refused';
 const {deleteAccountHandler}=await load('../server/delete-account.ts',{'./apple-jwt.ts':{appleJwt:async()=>'jwt'}});
 const handler=deleteAccountHandler(()=> 'configured',async(input)=>{
  const url=String(input);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'a'.repeat(36),identities:[{provider:'apple',identity_data:{sub:'owner'}}]});
  if(url.endsWith('/auth/token'))return Response.json({refresh_token:'refresh',id_token:`x.${Buffer.from(JSON.stringify({sub:'owner',aud:'configured',iss:'https://appleid.apple.com',exp:Math.floor(Date.now()/1000)+300})).toString('base64url')}.x`});
  if(url.endsWith('/auth/revoke'))return new Response(null,{status:mode==='refused'?502:200});
  if(mode==='lost')throw Error('lost admin response');
  return new Response(null,{status:mode==='failed'?502:200});
 });
 const request=()=>new Request('https://example.invalid',{method:'POST',headers:{authorization:'Bearer token'},body:JSON.stringify({authorizationCode:'code'})});
 assert.equal((await (await handler(request())).json()).refused,true);
 for(mode of ['lost','failed'])assert.equal((await (await handler(request())).json()).refused,undefined);
 mode='success';assert.deepEqual(await (await handler(request())).json(),{deleted:true});
});
