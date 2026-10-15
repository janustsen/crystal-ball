import type {AccountState} from './types.ts';
import {checkInDate,localDay,suggestedCheckIn} from './retention.ts';
import {yearAheadCandidates} from './year-ahead.ts';

// The daily ritual: a few small steps a day; finishing them lights a star, and seven stars draw a constellation.
// Nothing resets or counts down: a missed day only leaves a gap in the sky.
export type NotifyPrefs={daily:boolean;time:string;offered?:string;reoffered?:boolean};
export type Ritual={
 // Per local day, how far each step got (step id -> count). Kept for the last 60 days.
 days:Record<string,Record<string,number>>;
 // Every finished day, oldest first. Never pruned.
 stars:string[];
 // Distinct local days the app was opened, oldest first, last 60.
 opened:string[];
 notify:NotifyPrefs;
 // On-device usage counts for the private debug screen. Never sent anywhere.
 counts:Record<string,number>;
};
export const ritualSteps:{id:string;label:string;target:number}[]=[
 {id:'omen',label:'Read today’s insight',target:1},
 {id:'ask',label:'Ask the Ball or check in',target:1},
 {id:'questions',label:'Answer 3 questions about yourself',target:3},
];
export const morningTimes=['08:30','12:30','18:00'];
// No notification before 8am or from 9pm; the same window keeps teen evenings quiet.
export const quietHours={from:'21:00',until:'08:00'};
export const eveningTime='19:30';
export const emptyRitual=():Ritual=>({days:{},stars:[],opened:[],notify:{daily:false,time:morningTimes[0]},counts:{}});
export const ritualOf=(state:Pick<AccountState,'ritual'>):Ritual=>({...emptyRitual(),...state.ritual});

const recent=(list:string[],day:string)=>list.includes(day)?list:[...list,day].slice(-60);
export function dayProgress(ritual:Ritual,day=localDay()){
 const done=ritual.days[day]??{};
 const steps=ritualSteps.map(step=>({...step,count:Math.min(step.target,done[step.id]??0),done:(done[step.id]??0)>=step.target}));
 return {steps,lit:steps.filter(step=>step.done).length,done:steps.every(step=>step.done)};
}
// Records progress on one step; the day's star is added once, when its last step finishes.
export function markStep(ritual:Ritual,step:string,day=localDay(),amount=1):Ritual{
 const today={...ritual.days[day]};
 const target=ritualSteps.find(s=>s.id===step)?.target??1;
 if((today[step]??0)>=target)return ritual;
 today[step]=(today[step]??0)+amount;
 const days=Object.fromEntries(Object.entries({...ritual.days,[day]:today}).sort(([a],[b])=>a<b?-1:1).slice(-60));
 const next={...ritual,days};
 return dayProgress(next,day).done&&!ritual.stars.includes(day)?{...next,stars:[...ritual.stars,day],counts:bump(ritual.counts,'fullDays')}:next;
}
const bump=(counts:Record<string,number>,name:string)=>({...counts,[name]:(counts[name]??0)+1});
export const countEvent=(ritual:Ritual,name:string):Ritual=>({...ritual,counts:bump(ritual.counts,name)});
export const markOpened=(ritual:Ritual,day=localDay()):Ritual=>ritual.opened.includes(day)?ritual:{...ritual,opened:recent(ritual.opened,day)};

// Real constellations, each drawn as seven stars on a 100×60 sky.
export const constellations:{name:string;stars:[number,number][]}[]=[
 {name:'Ursa Major',stars:[[8,18],[24,14],[38,20],[50,28],[54,46],[76,48],[80,30]]},
 {name:'Orion',stars:[[30,8],[66,12],[42,30],[50,32],[58,34],[34,54],[70,52]]},
 {name:'Cassiopeia',stars:[[6,22],[22,40],[38,24],[54,42],[70,18],[84,34],[94,14]]},
 {name:'Lyra',stars:[[50,6],[42,22],[58,24],[38,40],[62,42],[34,56],[66,56]]},
 {name:'Cygnus',stars:[[50,4],[50,20],[50,34],[50,52],[22,22],[78,24],[36,44]]},
 {name:'Corona Borealis',stars:[[8,20],[20,36],[36,46],[52,48],[68,44],[82,32],[92,16]]},
 {name:'Pegasus',stars:[[10,10],[40,10],[40,40],[10,40],[62,30],[78,22],[94,28]]},
 {name:'Draco',stars:[[90,8],[78,16],[70,30],[54,34],[38,26],[26,40],[10,50]]},
];
export function constellation(stars:number){
 const index=Math.floor(stars/7),current=constellations[index%constellations.length];
 return {name:current.name,stars:current.stars,lit:stars%7,collected:index,names:Array.from({length:index},(_,i)=>constellations[i%constellations.length].name)};
}

// The notification opt-in: offered after the first forecast, offered once more after two further distinct open days, then only the toggle in Settings.
export function offerNotifications(ritual:Ritual,moment:'reveal'|'home',today=localDay()):boolean{
 const {notify}=ritual;
 if(notify.daily)return false;
 if(!notify.offered)return moment==='reveal';
 return moment==='home'&&!notify.reoffered&&ritual.opened.filter(day=>day>notify.offered!&&day<=today).length>=2;
}

// ---- Scheduling ----
export type Slot='morning'|'evening'|'dated';
export type Candidate={id:string;day:string;slot:Slot;priority:number;title:string;body:string;data:Record<string,string>;time?:string;
 // Weekly beats (such as a Sunday recap) still send once daily notifications have backed off to weekly.
 weekly?:boolean};
export type Planned={id:string;at:Date;title:string;body:string;data:Record<string,string>};
export type PlanContext={state:Pick<AccountState,'ritual'|'sunSign'|'history'|'yearAhead'>;now:Date;horizon:number};
export type NotificationSource=(context:PlanContext)=>Candidate[];
const notificationSources:NotificationSource[]=[dailyCandidates,checkInCandidates,yearAheadCandidates];
// Other features (a whisper, a weekly recap) register a source of candidates. The planner applies the two-a-day cap,
// quiet hours, check-in days and back-off to every source alike, so a source only proposes. Returns an unregister.
export function registerNotifications(source:NotificationSource){
 if(!notificationSources.includes(source))notificationSources.push(source);
 return ()=>{const i=notificationSources.indexOf(source);if(i>=0)notificationSources.splice(i,1)};
}

const title='Crystal Ball';
const sign=(s:string|null)=>s?s[0].toUpperCase()+s.slice(1):'';
// Lock-screen copy: never the user's question, answers or a friend's identity. Warm, a little wry, never guilt.
export const morningCopy=['Your insight is waiting.','A fresh insight just arrived.','The Ball polished itself for you this morning.','Today’s insight is ready when you are.','One small sign for today. Come and see.','The mist cleared overnight. Your insight is inside.','Mercury’s being dramatic. Your insight isn’t.','A new day, a new little insight.','The stars left you a note.','Your insight is warm and ready.','The Ball has a thought about your day.','Something small and bright for today is waiting.','A tiny insight for a big day.','Today’s sky has a message for you.','The Ball woke up curious about you.','Your daily sign is in.','A quiet insight to carry with you today.','The Ball read the sky so you don’t have to.','Fresh starlight, delivered.','Your insight: brewed, glowing, ready.','A little wonder for this morning.','The Ball saved you a seat by the window.'];
export const signCopy=(s:string)=>[`Your insight is waiting, ${s}.`,`${s}, the stars left you a note.`,`Today’s sky has a message for you, ${s}.`];
export const eveningCopy=['The Ball kept a little light on for you.','One more star could light up tonight.','A quiet minute with the Ball before the day ends?','Your sky is still open this evening.','The Ball is around if you have a question tonight.','A small evening ritual is waiting.','Tonight’s sky is clear. The Ball is listening.','Before you rest, one small step in your sky.'];
export const backOffCopy='The Ball will whisper weekly for now. Change this anytime in Settings.';
const dayNumber=(day:string)=>Math.floor(Date.parse(`${day}T00:00:00Z`)/86400000);
function dayAfter(now:Date,offset:number){const date=new Date(now);date.setHours(12,0,0,0);date.setDate(date.getDate()+offset);return localDay(date)}

// The ritual's own notifications: the morning insight and an evening nudge.
export function dailyCandidates({state,now,horizon}:PlanContext):Candidate[]{
 const ritual=ritualOf(state);
 if(!ritual.notify.daily)return [];
 const today=localDay(now),done=dayProgress(ritual,today).done,out:Candidate[]=[];
 for(let offset=0;offset<=horizon;offset++){
  const day=dayAfter(now,offset),n=dayNumber(day),signed=state.sunSign&&n%3===0;
  const morning=signed?signCopy(sign(state.sunSign))[Math.floor(n/3)%3]:morningCopy[n%morningCopy.length];
  out.push({id:'morning',day,slot:'morning',priority:0,title,body:offset===7?backOffCopy:morning,data:{ritual:'morning'}});
  if(!(offset===0&&done))out.push({id:'evening',day,slot:'evening',priority:0,title,body:eveningCopy[n%eveningCopy.length],data:{ritual:'evening'},time:eveningTime});
 }
 return out;
}
const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
export const quiet=(time:string)=>minutes(time)<minutes(quietHours.until)||minutes(time)>=minutes(quietHours.from);
// Back-off when the app goes unopened. Each open re-plans from that day, so opening the app re-arms daily notifications.
// ponytail: unopened days are inferred from the plan's offset, not from delivery receipts; a tap without opening still counts as unopened.
export function backedOff(offset:number,slot:Slot,weekly=false){
 if(slot==='dated'||weekly||offset<=3)return false;
 if(offset<=7)return slot==='evening'||offset%2===0;
 return slot==='evening'||offset%7!==0;
}
export function checkInCandidates({state}:PlanContext):Candidate[]{
 // Each day maps to whether a Love timing reading named that very day (not its follow-up three days later).
 const days=new Map<string,boolean>();
 for(const reading of state.history){
  if(reading.circleId||reading.outcome)continue;
  const date=checkInDate(suggestedCheckIn(reading));
  if(!date)continue;
  const due=localDay(date);days.set(due,days.get(due)||reading.timing==='love');date.setDate(date.getDate()+3);days.set(localDay(date),days.get(localDay(date))??false);
 }
 return [...days].map(([day,love])=>({id:love?'love-check-ins':'check-ins',day,slot:love?'dated':'evening',priority:100,...love?{title:'The day the Ball named',body:'Your Love timing is due. Did it happen?'}:{title:'Did it come true?',body:'Your forecasts are waiting in History.'},data:{checkIns:'1'},time:eveningTime}));
}
// iOS keeps at most 64 pending local notifications and silently drops the rest; the planner is the only scheduler,
// so capping its plan below that keeps every scheduled reminder real. Each open re-plans, so the nearest ones win.
export const pendingLimit=60;
export type Delivered=Record<string,string[]>;
export function planNotifications(state:PlanContext['state'],now=new Date(),horizon=28,delivered:Delivered={},additional:Candidate[]=[]):Planned[]{
 const context={state,now,horizon},ritual=ritualOf(state),today=localDay(now);
 const candidates=new Map<string,Candidate>();
 for(const candidate of [...notificationSources.flatMap(source=>source(context)),...additional]){
  const offset=dayNumber(candidate.day)-dayNumber(today),time=candidate.time??(candidate.slot==='morning'?ritual.notify.time:eveningTime);
  const id=`ritual-${candidate.day}-${candidate.id}`,at=new Date(`${candidate.day}T${time}:00`);
  if(offset<0||(offset>horizon&&candidate.slot!=='dated')||quiet(time)||backedOff(offset,candidate.slot,candidate.weekly)||!(at.getTime()>now.getTime())||delivered[candidate.day]?.includes(id))continue;
  const current=candidates.get(id);
  if(!current||candidate.priority>current.priority)candidates.set(id,{...candidate,time});
 }
 const counts=new Map(Object.entries(delivered).map(([day,ids])=>[day,new Set(ids).size]));
 const plan:Planned[]=[];
 for(const [id,c] of [...candidates].sort(([,a],[,b])=>b.priority-a.priority||a.time!.localeCompare(b.time!))){
  const count=counts.get(c.day)??0;if(count>=2)continue;
  plan.push({id,at:new Date(`${c.day}T${c.time}:00`),title:c.title,body:c.body,data:c.data});counts.set(c.day,count+1);
 }
 return plan.sort((a,b)=>a.at.getTime()-b.at.getTime()).slice(0,pendingLimit);
}
