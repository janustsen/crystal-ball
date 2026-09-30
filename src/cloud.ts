import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AccountState} from './types';
import {mergeBackup,validFacts,validPrediction} from './backup';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL,key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase=url&&key?createClient(url,key,{auth:{storage:AsyncStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export async function anonymousOwner(){
 if(!supabase)return null;
 const {data,error}=await supabase.auth.getSession();if(error)throw error;
 if(data.session)return data.session.user.id;
 const result=await supabase.auth.signInAnonymously();
 if(result.error||!result.data.user)throw result.error||new Error('Anonymous session unavailable');
 return result.data.user.id;
}
export async function restoreBackup(state:AccountState){
 if(!supabase)return state;
 const {data,error}=await supabase.auth.getSession();if(error)throw error;
 if(!data.session||data.session.user.is_anonymous)return state;
 const user_id=data.session.user.id;
 const facts=await supabase.from('knowledge').select('facts').eq('user_id',user_id).maybeSingle();
 if(facts.error)throw facts.error;
 // Page through the archive instead of silently stopping at Supabase's row limit.
 const history=[];
 for(let offset=0;;offset+=500){
  const result=await supabase.from('predictions').select('payload').eq('user_id',user_id).order('id').range(offset,offset+499);
  if(result.error)throw result.error;
  for(const row of result.data){if(!validPrediction(row.payload))throw new Error('Backup contains an unreadable reading.');history.push(row.payload)}
  if(result.data.length<500)break;
 }
 const remembered=facts.data?.facts??{};
 if(!validFacts(remembered))throw new Error('Backup contains unreadable facts.');
 return mergeBackup(state,{facts:remembered,history});
}
export async function mirror(state:AccountState){
 if(!supabase)return;
 const user_id=await anonymousOwner();if(!user_id)return;
 const saved=await supabase.from('knowledge').upsert({user_id,facts:state.facts,updated_at:new Date().toISOString()});if(saved.error)throw saved.error;
 if(state.history.length){const result=await supabase.from('predictions').upsert(state.history.map(p=>({id:p.id,user_id,payload:p,created_at:p.createdAt})),{onConflict:'user_id,id'});if(result.error)throw result.error;}
 else {const result=await supabase.from('predictions').delete().eq('user_id',user_id);if(result.error)throw result.error;}
}
