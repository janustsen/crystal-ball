import {ballVoice} from './voice.ts';
import type {ModelProvider} from './provider.ts';
import {moderateSocialLine} from './social.ts';
import {serviceRpc} from './social-push.ts';

// The Friday whose omens must exist now. It stays current through Saturday UTC, until the last zone's Friday night has begun.
export function skyWeek(now:Date){
 const day=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-1));
 day.setUTCDate(day.getUTCDate()+(12-day.getUTCDay())%7);
 return day.toISOString().slice(0,10);
}

// A random motif keeps each group's omen its own without sending any member data to the model.
const motifs=['a new moon','a passing comet','a meteor shower','the northern lights','twin stars','a lantern-lit sky','a rising tide moon','a shy constellation','a silver eclipse','a planet at its brightest','a falling star','dawn after a long night'];

// Run hourly in a trusted scheduler. Each School and Circle gets one moderated omen per week; failed groups retry next run.
// The model sees only the group kind and a motif, never member data, so no per-user AI consent is involved.
export async function openSky(env:(key:string)=>string|undefined,model:ModelProvider,now=new Date(),transport:typeof fetch=fetch,pick=(count:number)=>Math.floor(Math.random()*count)){
 const rpc=serviceRpc(env,transport),week=skyWeek(now);
 const targets:{school_id:string|null;circle_id:string|null}[]=await rpc('sky_omen_targets',{target_week:week});
 let opened=0;
 // ponytail: sequential, ~25s per group on local Qwen and 500 targets per run; batch or parallelize when groups outgrow an hourly run.
 for(const target of targets){
  try{
   const {text}=await model.json<{text:string}>(
    ballVoice+' Write one shared, astrology-flavored omen that a whole group opens together on a Friday night, for reflection and entertainment. The group is a school community or a small Circle of friends; speak to them as "you" together. Hopeful, inclusive and generic: no names, places, schools, dates, private facts, romance or feelings claims, guarantees, or advice. Build it around the supplied motif. Use 8 to 16 words in one complete sentence ending with punctuation. Return text only in the JSON field.',
    {group:target.school_id?'school':'circle',motif:motifs[pick(motifs.length)]},
    {type:'object',properties:{text:{type:'string',minLength:10,maxLength:160}},required:['text'],additionalProperties:false},
    value=>{
     if(!value||typeof value!=='object'||!('text'in value)||typeof value.text!=='string')return false;
     const text=value.text.trim();
     return text.length>=10&&text.length<=160&&text.split(/\s+/).length<=16&&!/[\r\n]/.test(text)&&/[.!?]$/.test(text)||{valid:false,feedback:'Rewrite as one sentence of 8 to 16 words ending with punctuation.'};
    });
   const omen=text.trim();
   await moderateSocialLine(omen,'star',true,model);
   await rpc('save_sky_omen',{target_week:week,school:target.school_id,circle:target.circle_id,text_value:omen});
   opened++;
  }catch{/* Unsafe or failed generation leaves the group closed; the next run retries it. */}
 }
 return {week,targets:targets.length,opened};
}
