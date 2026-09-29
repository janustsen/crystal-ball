import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AccountState} from './types';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL,key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const supabase=url&&key?createClient(url,key,{auth:{storage:AsyncStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
let owner:Promise<string>|null=null;
export async function anonymousOwner(){
 if(!supabase)return null;
 if(!owner)owner=(async()=>{const {data}=await supabase.auth.getSession();if(data.session)return data.session.user.id;const result=await supabase.auth.signInAnonymously();if(result.error||!result.data.user)throw result.error||new Error('Anonymous session unavailable');return result.data.user.id;})().catch(error=>{owner=null;throw error});
 return owner;
}
export async function mirror(state:AccountState){
 if(!supabase)return;
 const user_id=await anonymousOwner();if(!user_id)return;
 const saved=await supabase.from('knowledge').upsert({user_id,facts:state.facts,updated_at:new Date().toISOString()});if(saved.error)throw saved.error;
 if(state.history.length){const result=await supabase.from('predictions').upsert(state.history.map(p=>({id:p.id,user_id,payload:p,created_at:p.createdAt})));if(result.error)throw result.error;}
 else {const result=await supabase.from('predictions').delete().eq('user_id',user_id);if(result.error)throw result.error;}
}
