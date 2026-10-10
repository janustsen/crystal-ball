import {activityTheme,skyPrompts,type SkyPrompt} from './social-policy';
import type {Prediction,Whisper} from './types';
import {localDay} from './retention';
import {addDays} from './whisper';

// Counts only: the recap never scores whether forecasts came true.
export type YearRecap={year:number;readings:number;themes:{theme:SkyPrompt;count:number}[];golden:number;yes:number};
export function yearRecap(history:Prediction[],year:number):YearRecap{
 const readings=history.filter(p=>new Date(p.createdAt).getFullYear()===year),counts=new Map<SkyPrompt,number>();
 for(const p of readings){const theme=activityTheme(p.question);counts.set(theme,(counts.get(theme)??0)+1)}
 return {year,readings:readings.length,themes:[...counts].map(([theme,count])=>({theme,count})).sort((a,b)=>b.count-a.count),golden:readings.filter(p=>p.golden).length,yes:readings.filter(p=>p.outcome==='yes').length};
}

// "Your week in the Ball": the seven local days ending today, in counts only.
export type WeekRecap={from:string;to:string;readings:number;golden:number;checkIns:number;whispers:number;landed:number;theme:SkyPrompt|null;suggestion:string};
// Next week's suggestion tries an area not asked about this week; teens skip love and money.
const suggestionOrder:SkyPrompt[]=['growth','learning','work','moving','love','money'];
export function weekRecap(history:Prediction[],whispers:Whisper[]=[],today=localDay(),teen=false):WeekRecap{
 const from=addDays(today,-6),inWeek=(day?:string)=>!!day&&day>=from&&day<=today;
 const readings=history.filter(p=>!p.circleId&&inWeek(localDay(new Date(p.createdAt)))),counts=new Map<SkyPrompt,number>();
 for(const p of readings){const theme=activityTheme(p.question);counts.set(theme,(counts.get(theme)??0)+1)}
 const theme=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0]??null;
 const open=suggestionOrder.filter(t=>!(teen&&(t==='love'||t==='money'))),next=open.find(t=>!counts.has(t))??open[0];
 const checked=whispers.filter(w=>w.outcome&&inWeek(w.day));
 return {from,to:today,readings:readings.length,golden:readings.filter(p=>p.golden).length,checkIns:history.filter(p=>!p.circleId&&p.outcome&&inWeek(p.checkedInAt)).length,whispers:checked.length,landed:checked.filter(w=>w.outcome==='yes').length,theme,suggestion:skyPrompts[next].question};
}
