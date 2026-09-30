import {anonymousOwner,supabase} from './cloud';
import {isSkyPrompt,safeSealedHeadline,socialUnavailable,type SkyPrompt,type SkyStar,type SocialProfile} from './social-policy';
import type {Prediction} from './types';

export type Circle = {id:string;owner_id:string};
export type CircleMember = {circle_id:string;user_id:string;joined_at:string;consulted_on:string|null;theme:SkyPrompt|null;sun_sign:string|null;can_ask:boolean};
export type CircleReaction = {circle_id:string;target_id:string;user_id:string;day:string};
export type SentSeal = {id:string;headline:string;token:string;opened_at:string|null;expires_at:string};
export type FriendTarget={circle:string;member:string};
export type SocialDraft={id:string;wording:string;theme:SkyPrompt};
export type SocialSnapshot = {owner:string;stars:SkyStar[];ownStar:string|null;circles:Circle[];members:CircleMember[];reactions:CircleReaction[];seals:SentSeal[];profile:{age_band:string;friends_can_ask:boolean}|null;notices:number};

async function client(){
 if(!supabase)throw new Error(socialUnavailable);
 const owner=await anonymousOwner();
 if(!owner)throw new Error(socialUnavailable);
 return {db:supabase,owner};
}
async function rpc(name:string,args?:Record<string,unknown>){
 const {db}=await client();
 const {data,error}=await db.rpc(name,args);
 if(error)throw new Error(error.message);
 return data;
}
async function socialRequest<T>(body:Record<string,unknown>,signal?:AbortSignal):Promise<T>{
 const {db}=await client(),session=await db.auth.getSession();
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
 try{
  const response=await fetch(`${process.env.EXPO_PUBLIC_ENGINE_URL||'http://127.0.0.1:8787'}/social`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.data.session?.access_token}`},body:JSON.stringify(body),signal:signal??controller.signal});
  const result=await response.json();if(!response.ok)throw new Error(result.message||socialUnavailable);return result;
 }finally{clearTimeout(timeout)}
}
export const syncSocialProfile=(profile:SocialProfile)=>socialRequest({action:'profile',...profile});
export const prepareSocialDraft=(kind:'star'|'seal',text:string)=>socialRequest<SocialDraft>({action:'draft',kind,text});
export const friendForecast=(question:string,target:FriendTarget,signal:AbortSignal)=>socialRequest<Prediction>({action:'friend',question,...target},signal);
export async function loadSocial():Promise<SocialSnapshot>{
 const {db,owner}=await client(),day=new Date().toISOString().slice(0,10);
 const [sky,own,circles,members,reactions,seals,profile,notices]=await Promise.all([
  db.rpc('tonights_sky'),db.from('sky_stars').select('id').eq('day',day).eq('withdrawn',false),db.from('circles').select('id,owner_id'),
  db.rpc('circle_people'),db.from('circle_reactions').select('circle_id,target_id,user_id,day').eq('day',day),
  db.from('sealed_forecasts').select('id,headline,token,opened_at,expires_at').eq('revoked',false).gt('expires_at',new Date().toISOString()),
  db.from('social_profiles').select('age_band,friends_can_ask'),db.from('friend_notices').select('id').eq('seen',false),
 ]);
 for(const result of [sky,own,circles,members,reactions,seals,profile,notices])if(result.error)throw new Error(socialUnavailable);
 const stars:SkyStar[]=[];
 for(const row of sky.data??[]){
  if(isSkyPrompt(row.theme)&&safeSealedHeadline(row.wording)&&typeof row.id==='string'&&Number.isFinite(row.resonances))
   stars.push({id:row.id,theme:row.theme,wording:row.wording,resonances:row.resonances,resonated:row.resonated===true,mine:row.mine===true,synthetic:false});
 }
 return {owner,stars,ownStar:own.data?.[0]?.id??null,circles:circles.data??[],members:members.data??[],reactions:reactions.data??[],seals:(seals.data??[]).filter(seal=>safeSealedHeadline(seal.headline)),profile:profile.data?.[0]??null,notices:notices.data?.length??0};
}
export const publishStar=(draft:SocialDraft)=>rpc('publish_star',{approved_draft:draft.id});
export const removeStar=(id:string)=>rpc('withdraw_star',{star:id});
export const reportStar=(id:string)=>rpc('report_star',{star:id});
export const blockStarAuthor=(id:string)=>rpc('block_person',{star:id});
export const blockMember=(id:string)=>rpc('block_person',{member:id});
export const setFriendConsent=(allowed:boolean)=>rpc('set_friend_consent',{allowed});
export const dismissFriendNotices=()=>rpc('dismiss_friend_notices');
export const resonate=(id:string)=>rpc('resonate',{star:id});
export const createCircle=()=>rpc('create_circle');
export const inviteToCircle=(id:string)=>rpc('invite_to_circle',{target:id});
export const joinCircle=(token:string)=>rpc('join_circle',{invite:token});
export const leaveCircle=(id:string)=>rpc('leave_circle',{target:id});
export const reactInCircle=(circle:string,member:string)=>rpc('react_in_circle',{target_circle:circle,target_member:member});
export const checkInCircles=(theme:SkyPrompt)=>rpc('circle_checkin',{activity_theme:theme});
export const sealForecast=(draft:SocialDraft):Promise<string>=>rpc('seal_forecast',{approved_draft:draft.id});
export async function openForecast(token:string):Promise<string>{
 const headline:unknown=await rpc('open_forecast',{seal:token});
 if(!safeSealedHeadline(headline))throw new Error('This card could not be shown. Ask the Ball something hopeful instead.');
 return headline;
}
export const revokeSeal=(id:string)=>rpc('revoke_forecast',{card:id});
