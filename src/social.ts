import {allRows} from './social-pagination';
import {anonymousOwner,supabase} from './cloud';
import {aiProvider,engineUrl,previewHeaders} from './api';
import type {Balance} from './billing';
import {isSkyPrompt,safeSealedHeadline,socialUnavailable,type SkyPrompt,type SkyStar,type SocialProfile} from './social-policy';
import type {Prediction,FriendTarget} from './types';

export type Identity={handle:string;display_name:string;avatar:string};
export type CircleInvite=Identity&{id:string;circle_id:string};
export type CircleMoment={id:string;circle_id:string;user_id:string;kind:'yes'|'no'|'pending'|'golden';day:string};
export type CircleForecast={id:string;asker_id:string;charged_at:string|null;circle_id:string;question:string;headline:string;due_date:string;created_at:string};
export type CircleForecastDraft=Pick<CircleForecast,'id'|'circle_id'|'question'|'headline'|'due_date'>;
// A private room's tally is sealed (counts null) until everyone votes or the due day ends.
export type CircleTally={forecast_id:string;mine:'yes'|'no'|'pending'|null}&({sealed:false;yes:number;no:number;pending:number}|{sealed:true;yes:null;no:null;pending:null});
export type School = {id:string;name:string;city:string;latitude:number;longitude:number};
export type SchoolSuggestion = {circle_id:string;user_id:string};
export type Circle = {id:string;owner_id:string};
export type CircleMember = {circle_id:string;user_id:string;joined_at:string;consulted_on:string|null;theme:SkyPrompt|null;sun_sign:string|null;can_ask:boolean;handle:string|null;display_name:string|null;avatar:string};
export type CircleReaction = {circle_id:string;target_id:string;user_id:string;day:string;emoji:string};
export type SentSeal = {id:string;headline:string;token:string;opened_at:string|null};
export type SocialDraft={id:string;wording:string;theme:SkyPrompt};
export type SocialSnapshot = {owner:string;stars:SkyStar[];ownStar:string|null;circles:Circle[];members:CircleMember[];reactions:CircleReaction[];seals:SentSeal[];profile:{age_band:string;friends_can_ask:boolean;school_id:string|null;handle:string|null;display_name:string|null;avatar:string}|null;notices:number;schools:School[];schoolSuggestions:SchoolSuggestion[];schoolOnly:boolean;requests:CircleInvite[];moments:CircleMoment[];glows:{circle_id:string;day:string}[];forecasts:CircleForecast[];votes:CircleTally[];rooms:string[];receivedSeals:{token:string;opened_at:string|null}[]};

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
 if((body.action==='draft'||body.action==='friend'||body.action==='circle')&&aiProvider&&body.aiConsent!==aiProvider)throw new Error(`Allow ${aiProvider} AI processing in Ask before sharing a reading or asking about a friend.`);
 const {db}=await client(),session=await db.auth.getSession();
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
 try{
  const response=await fetch(`${engineUrl}/social`,{method:'POST',headers:{'Content-Type':'application/json',...previewHeaders,Authorization:`Bearer ${session.data.session?.access_token}`},body:JSON.stringify(body),signal:signal??controller.signal});
  const result=await response.json();if(!response.ok)throw new Error(result.message||socialUnavailable);return result;
 }finally{clearTimeout(timeout)}
}
export const syncSocialProfile=(profile:SocialProfile)=>socialRequest({action:'profile',...profile});
export const prepareSocialDraft=(kind:'star'|'seal',text:string,aiConsent='')=>socialRequest<SocialDraft>({action:'draft',kind,text,aiConsent});
export const friendForecast=(question:string,target:FriendTarget,signal:AbortSignal,aiConsent='',requestId?:string)=>socialRequest<Prediction&{balance?:Balance}>({action:'friend',question,...target,aiConsent,requestId},signal);
export async function loadSocial(account:SocialProfile,schoolOnly=false):Promise<SocialSnapshot>{
 await syncSocialProfile(account);
 const {db,owner}=await client(),day=new Date().toISOString().slice(0,10);
 const [sky,own,circles,members,reactions,seals,profile,notices,schools,suggestions,requests,moments,glows,forecasts,votes,receivedSeals,rooms]=await Promise.all([
  db.rpc('tonights_sky',{my_school:schoolOnly}),db.from('sky_stars').select('id').eq('day',day),db.from('circles').select('id,owner_id'),
  db.rpc('circle_people'),allRows<CircleReaction>((from,to)=>db.from('circle_reactions').select('circle_id,target_id,user_id,day,emoji').eq('day',day).order('circle_id').order('target_id').order('user_id').order('day').range(from,to)),
  allRows<SentSeal>((from,to)=>db.from('sealed_forecasts').select('id,headline,token,opened_at').eq('revoked',false).order('id').range(from,to)),
  db.from('social_profiles').select('age_band,friends_can_ask,school_id,handle,display_name,avatar'),allRows<{id:string}>((from,to)=>db.from('friend_notices').select('id').eq('seen',false).order('id').range(from,to)),
  allRows<School>((from,to)=>db.from('schools').select('id,name,city,latitude,longitude').order('id').range(from,to)),db.rpc('school_circle_suggestions'),
  allRows<CircleInvite>((from,to)=>db.rpc('circle_inbox').order('id').range(from,to)),allRows<CircleMoment>((from,to)=>db.from('circle_moments').select('id,circle_id,user_id,kind,day').order('id').range(from,to)),allRows<{circle_id:string;day:string}>((from,to)=>db.from('circle_glows').select('circle_id,day').order('circle_id').order('day').range(from,to)),allRows<CircleForecast>((from,to)=>db.from('circle_forecasts').select('id,asker_id,charged_at,circle_id,question,headline,due_date,created_at').order('id').range(from,to)),allRows<CircleTally>((from,to)=>db.rpc('circle_vote_tallies').order('forecast_id').range(from,to)),allRows<{token:string;opened_at:string|null}>((from,to)=>db.rpc('sealed_inbox').order('token').range(from,to)),allRows<{circle_id:string}>((from,to)=>db.rpc('private_rooms').order('circle_id').range(from,to)),
 ]);
 // School data and room status are optional: their failure leaves Sky and Circles working. Tallies stay server-sealed either way.
 for(const result of [sky,own,circles,members,reactions,seals,profile,notices,requests,moments,glows,forecasts,votes,receivedSeals])if(result.error)throw new Error(socialUnavailable);
 const stars:SkyStar[]=[];
 for(const row of sky.data??[]){
  if(isSkyPrompt(row.theme)&&safeSealedHeadline(row.wording)&&typeof row.id==='string'&&Number.isFinite(row.resonances))
   stars.push({id:row.id,theme:row.theme,wording:row.wording,resonances:row.resonances,resonated:row.resonated===true,mine:row.mine===true,synthetic:false});
 }
 return {owner,stars,ownStar:own.data?.[0]?.id??null,circles:circles.data??[],members:members.data??[],reactions:reactions.data??[],seals:(seals.data??[]).filter(seal=>safeSealedHeadline(seal.headline)),profile:profile.data?.[0]??null,notices:notices.data?.length??0,schools:schools.data??[],schoolSuggestions:suggestions.data??[],schoolOnly,requests:requests.data??[],moments:moments.data??[],glows:glows.data??[],forecasts:forecasts.data??[],votes:votes.data??[],rooms:(rooms.data??[]).map(room=>room.circle_id),receivedSeals:receivedSeals.data??[]};
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
export const createSchoolCircleInvite=(previous?:string):Promise<string>=>rpc('create_school_circle_invite',{previous:previous??null});
export const inviteToCircle=(id:string)=>rpc('invite_to_circle',{target:id});
export const joinCircle=(token:string)=>rpc('join_circle',{invite:token});
export const leaveCircle=(id:string)=>rpc('leave_circle',{target:id});
export const reactInCircle=(circle:string,member:string,reaction='✦')=>rpc('react_in_circle',{target_circle:circle,target_member:member,reaction});
export const checkInCircles=(theme:SkyPrompt)=>rpc('circle_checkin',{activity_theme:theme});
export const sealForecast=(draft:SocialDraft):Promise<string>=>rpc('seal_forecast',{approved_draft:draft.id});
export async function openForecast(token:string):Promise<string>{
 const headline:unknown=await rpc('open_forecast',{seal:token});
 if(!safeSealedHeadline(headline))throw new Error('This card could not be shown. Ask the Ball something hopeful instead.');
 return headline;
}
export const revokeSeal=(id:string)=>rpc('revoke_forecast',{card:id});

export const setSchool=(school:string|null)=>rpc('set_school',{chosen_school:school});

export const setIdentity=(identity:Identity)=>rpc('set_social_identity',{chosen_handle:identity.handle,chosen_name:identity.display_name,chosen_avatar:identity.avatar});
export const searchHandles=(prefix:string):Promise<Identity[]>=>rpc('search_handles',{prefix});
export const blockHandle=(handle:string)=>rpc('block_handle',{target_handle:handle});
export const requestInvite=(circle:string,handle:string)=>rpc('request_circle_invite',{target:circle,target_handle:handle});
export const answerInvite=(id:string,accept:boolean)=>rpc('answer_circle_invite',{request_id:id,accept});
export const manageCircle=(circle:string,person:string,operation:'remove'|'transfer')=>rpc('manage_circle',{target:circle,person,operation});
let momentWork:Promise<unknown>=Promise.resolve();
export function shareCircleMoment(reading:string,moment:'yes'|'no'|'pending'|'golden'){
 const work=momentWork.catch(()=>{}).then(()=>rpc('share_circle_moment',{reading,moment}));
 momentWork=work;
 return work;
}
export const prepareCircleForecast=(circle:string,question:string,aiConsent='')=>socialRequest<CircleForecastDraft>({action:'circle',circle,question,aiConsent});
export const publishCircleForecast=(draft:string):Promise<CircleForecast>=>rpc('publish_circle_forecast',{approved_draft:draft});
export const setPrivateRoom=(circle:string,enabled:boolean)=>rpc('set_private_room',{target:circle,enabled});
export const voteCircleForecast=(forecast:string,answer:'yes'|'no'|'pending')=>rpc('vote_circle_forecast',{forecast,answer});
export const sendSeal=(draft:SocialDraft,circle:string,member:string)=>rpc('send_sealed_forecast',{approved_draft:draft.id,target_circle:circle,target_member:member});

export const setSocialPush=(token:string|null)=>rpc('set_social_push',{push_token:token});
