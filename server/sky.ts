import {ballVoice} from './voice.ts';
import type {ModelProvider} from './provider.ts';
import {moderateSocialLine} from './social.ts';
import {serviceRpc} from './social-push.ts';
import {skyLine,skyOn} from '../src/real-sky.ts';

// The Friday whose omens must exist now. It stays current through Saturday UTC, until the last zone's Friday night has begun.
export function skyWeek(now:Date){
 const day=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-1));
 day.setUTCDate(day.getUTCDate()+(12-day.getUTCDay())%7);
 return day.toISOString().slice(0,10);
}

// Before Friday (UTC), last Friday's week is still open everywhere, so its missing omens are retried first.
export function skyWeeks(now:Date){
 const upcoming=skyWeek(now);
 if(upcoming<=now.toISOString().slice(0,10))return [upcoming];
 const current=new Date(`${upcoming}T00:00:00Z`);current.setUTCDate(current.getUTCDate()-7);
 return [current.toISOString().slice(0,10),upcoming];
}

// Run hourly in a trusted scheduler. Each School and Circle gets one moderated omen per week; failed groups retry next run.
// The model sees only the group kind and that Friday's real sky, never member data, so no per-user AI consent is involved.
export async function openSky(env:(key:string)=>string|undefined,model:ModelProvider,now=new Date(),transport:typeof fetch=fetch){
 const rpc=serviceRpc(env,transport),weeks=skyWeeks(now),deadline=AbortSignal.timeout(105000),source=model;
 model={json:(system,input,schema,valid,signal)=>source.json(system,input,schema,valid,signal?AbortSignal.any([deadline,signal]):deadline)};
 const targets:{week:string;school_id:string|null;circle_id:string|null}[]=[];
 for(const week of weeks)for(const target of await rpc('sky_omen_targets',{target_week:week}))targets.push({...target,week});
 let opened=0;
 // Missing groups retry hourly; a single worker stays inside Supabase’s free 150s wall limit.
 for(const target of targets){
  if(deadline.aborted)break;
  try{
   const {text}=await model.json<{text:string}>(
    ballVoice+' Write one shared, astrology-flavored omen that a whole group opens together on a Friday night, for reflection and entertainment. The group is a school community or a small Circle of friends; speak to them as "you" together. Hopeful, inclusive and generic: no names, places, schools, dates, private facts, romance or feelings claims, guarantees, or advice. Build it around the supplied sky, that Friday night’s real Moon; mention no other planet or sky event. Use 8 to 16 words in one complete sentence ending with punctuation. Return text only in the JSON field.',
    {group:target.school_id?'school':'circle',sky:skyLine(skyOn(target.week,'UTC'))},
    {type:'object',properties:{text:{type:'string',minLength:10,maxLength:160}},required:['text'],additionalProperties:false},
    value=>{
     if(!value||typeof value!=='object'||!('text'in value)||typeof value.text!=='string')return false;
     const text=value.text.trim();
     return text.length>=10&&text.length<=160&&text.split(/\s+/).length<=16&&!/[\r\n]/.test(text)&&/[.!?]$/.test(text)||{valid:false,feedback:'Rewrite as one sentence of 8 to 16 words ending with punctuation.'};
    });
   const omen=text.trim();
   await moderateSocialLine(omen,'star',true,model);
   await rpc('save_sky_omen',{target_week:target.week,school:target.school_id,circle:target.circle_id,text_value:omen});
   opened++;
  }catch{/* Unsafe or failed generation leaves the group closed; the next run retries it. */}
 }
 return {week:weeks.at(-1)!,targets:targets.length,opened};
}
