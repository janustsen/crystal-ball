import {createClient,isAuthRetryableFetchError,isAuthSessionMissingError,type SupabaseClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {canRead} from './profile';
import {questionsAsked} from './ladder';
import type {AccountState} from './types';
import {validFacts,validPrediction} from './backup';
import {askFor,asksOf,selfAnswers,teenSafe} from './ball-asks';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL,key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase=url&&key?createClient(url,key,{auth:{storage:AsyncStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
const pendingOwners=new WeakMap<SupabaseClient,Promise<string>>(),checkedOwners=new WeakSet<SupabaseClient>();
// A server database reset leaves the device holding a session for a user that no longer exists, so the stored
// session is checked once per launch and replaced by a new anonymous one when the server rejects it.
export async function anonymousOwner(client:SupabaseClient|null=supabase){
 if(!client)return null;
 let pending=pendingOwners.get(client);
 if(!pending){
  pending=(async()=>{
   // A refresh token the server rejects has already cleared the stored session.
   const {data,error}=await client.auth.getSession();if(error&&isAuthRetryableFetchError(error))throw error;
   if(data.session){
    if(checkedOwners.has(client))return data.session.user.id;
    const {error}=await client.auth.getUser();
    if(!error)checkedOwners.add(client);
    // Only a server that rejects the session replaces it; an outage keeps the owner and checks again next time.
    if(!error||!(isAuthSessionMissingError(error)||error.status===401||error.status===403))return data.session.user.id;
   }
   const result=await client.auth.signInAnonymously();
   if(result.error||!result.data.user)throw result.error||new Error('Anonymous session unavailable');
   checkedOwners.add(client);
   return result.data.user.id;
  })().finally(()=>pendingOwners.delete(client));
  pendingOwners.set(client,pending);
 }
 return pending;
}
// Metered requests carry the anonymous session; without Supabase (local preview) readings are counted on-device.
export async function authorization(client:SupabaseClient|null=supabase):Promise<Record<string,string>>{
 if(!client)return {};
 await anonymousOwner(client);
 const {data,error}=await client.auth.getSession();if(error)throw error;
 return data.session?{Authorization:`Bearer ${data.session.access_token}`}:{};
}
export async function restoreBackup(state:AccountState,client:SupabaseClient|null=supabase){
 if(!client)return state;
 const {data,error}=await client.auth.getSession();if(error)throw error;
 if(!data.session||data.session.user.is_anonymous)throw new Error('Sign in with Apple to restore.');
 const user_id=data.session.user.id;
 const facts=await client.from('knowledge').select('facts').eq('user_id',user_id).maybeSingle();
 if(facts.error)throw facts.error;
 if(!facts.data)throw new Error('No saved Apple backup was found.');
 // Page through the archive instead of silently stopping at Supabase's row limit.
 const history=[];
 for(let offset=0;;offset+=500){
  const result=await client.from('predictions').select('payload').eq('user_id',user_id).order('id').range(offset,offset+499);
  if(result.error)throw result.error;
  for(const row of result.data){if(!validPrediction(row.payload))throw new Error('Backup contains an unreadable reading.');history.push(row.payload)}
  if(result.data.length<500)break;
 }
 const remembered=facts.data?.facts??{};
 if(!validFacts(remembered))throw new Error('Backup contains unreadable facts.');
 history.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 // The chart weather cache may be another account's; the server returns this account's month on request.
 const progress=asksOf(state),seen=[...new Set([...progress.seen,...selfAnswers(remembered,teenSafe(state)).map(({key})=>askFor(key)!.id)])];
 return {...state,facts:remembered,history,ladder:{...state.ladder,asked:Math.max(questionsAsked(state),history.length)},asks:{...progress,seen,skipped:progress.skipped.filter(id=>!seen.includes(id))},backupOwner:user_id,chartWeather:undefined};
}
export async function mirror(state:AccountState,client:SupabaseClient|null=supabase){
 if(!client||!canRead(state))return;
 const {data,error}=await client.auth.getSession();if(error)throw error;
 const user_id=data.session?.user.id;
 if(!user_id||data.session?.user.is_anonymous||state.backupOwner!==user_id)throw new Error('Backup account changed. Sign in before uploading.');
 const saved=await client.from('knowledge').upsert({user_id,facts:state.facts,updated_at:new Date().toISOString()});if(saved.error)throw saved.error;
 if(state.history.length){const result=await client.from('predictions').upsert(state.history.map(p=>({id:p.id,user_id,payload:p,created_at:p.createdAt})),{onConflict:'user_id,id'});if(result.error)throw result.error;}
 let removal=client.from('predictions').delete().eq('user_id',user_id);
 if(state.history.length)removal=removal.not('id','in',`(${state.history.map(p=>p.id).join(',')})`);
 const removed=await removal;if(removed.error)throw removed.error;
}

// The admin and Apple keys remain on the Edge Function. The app sends only its session and fresh Apple code.
export class AccountDeletionRefused extends Error {}
export async function deleteAppleAccount(authorizationCode:string){
 if(!supabase||!url)throw new AccountDeletionRefused('Account deletion is not configured.');
 const response=await fetch(`${url}/functions/v1/delete-account`,{method:'POST',headers:{'Content-Type':'application/json',...await authorization()},body:JSON.stringify({authorizationCode}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();
 if(!response.ok&&result.refused===true)throw new AccountDeletionRefused(result.error||'Account deletion was refused.');
 if(!response.ok||result.deleted!==true)throw new Error(result.error||'Account deletion did not finish.');
 const signedOut=await supabase.auth.signOut({scope:'local'});
 if(signedOut.error)throw signedOut.error;
}
