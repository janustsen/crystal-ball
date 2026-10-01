import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AccountState} from './types';
import {mergeBackup,validFacts,validPrediction,pendingBackupDeletion,acknowledgeBackup} from './backup';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL,key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase=url&&key?createClient(url,key,{auth:{storage:AsyncStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export async function anonymousOwner(client:SupabaseClient|null=supabase){
 if(!client)return null;
 const {data,error}=await client.auth.getSession();if(error)throw error;
 if(data.session)return data.session.user.id;
 const result=await client.auth.signInAnonymously();
 if(result.error||!result.data.user)throw result.error||new Error('Anonymous session unavailable');
 return result.data.user.id;
}
export async function restoreBackup(state:AccountState,client:SupabaseClient|null=supabase){
 if(!client)return state;
 const {data,error}=await client.auth.getSession();if(error)throw error;
 const user_id=data.session?.user.id ?? await anonymousOwner(client);
 if(!user_id)return state;
 if(pendingBackupDeletion(state)){
  if(state.backupOwner!==user_id)throw new Error('Pending deletions belong to another backup account.');
  const receipt=await mirror(state,client);if(receipt)state=acknowledgeBackup(state,receipt);
 }
 if(!data.session||data.session.user.is_anonymous)return {...state,backupOwner:user_id};
 const facts=await client.from('knowledge').select('facts').eq('user_id',user_id).maybeSingle();
 if(facts.error)throw facts.error;
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
 return {...mergeBackup(state,{facts:remembered,history}),backupOwner:user_id};
}
export async function mirror(state:AccountState,client:SupabaseClient|null=supabase){
 if(!client)return null;
 const user_id=await anonymousOwner(client);if(!user_id)return null;
 if((state.backupOwner&&state.backupOwner!==user_id)||(pendingBackupDeletion(state)&&state.backupOwner!==user_id))throw new Error('Backup account changed. Restore before uploading.');
 const acknowledged=state.backupAcknowledged??0;
 const clearAll=(state.backupDeletions?.all??0)>acknowledged;
 const remote=await client.from('knowledge').select('facts').eq('user_id',user_id).maybeSingle();
 if(remote.error)throw remote.error;
 if(!validFacts(remote.data?.facts??{}))throw new Error('Backup contains unreadable facts.');
 const facts={...(clearAll?{}:remote.data?.facts??{})};
 for(const [key,revision] of Object.entries(state.backupDeletions?.facts??{}))if(revision>acknowledged)delete facts[key];
 const saved=await client.from('knowledge').upsert({user_id,facts:{...facts,...state.facts},updated_at:new Date().toISOString()});if(saved.error)throw saved.error;
 const deleted=Object.entries(state.backupDeletions?.history??{}).filter(([,revision])=>revision>acknowledged).map(([id])=>id);
 if(clearAll||deleted.length){
  let query=client.from('predictions').delete().eq('user_id',user_id);
  if(!clearAll)query=query.in('id',deleted);
  const result=await query;if(result.error)throw result.error;
 }
 if(state.history.length){const result=await client.from('predictions').upsert(state.history.map(p=>({id:p.id,user_id,payload:p,created_at:p.createdAt})),{onConflict:'user_id,id'});if(result.error)throw result.error;}
 return {owner:user_id,revision:state.backupRevision??0};
}
