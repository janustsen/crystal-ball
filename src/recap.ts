import {activityTheme,type SkyPrompt} from './social-policy';
import type {Prediction} from './types';

// Counts only: the recap never scores whether forecasts came true.
export type YearRecap={year:number;readings:number;themes:{theme:SkyPrompt;count:number}[];golden:number;yes:number};
export function yearRecap(history:Prediction[],year:number):YearRecap{
 const readings=history.filter(p=>new Date(p.createdAt).getFullYear()===year),counts=new Map<SkyPrompt,number>();
 for(const p of readings){const theme=activityTheme(p.question);counts.set(theme,(counts.get(theme)??0)+1)}
 return {year,readings:readings.length,themes:[...counts].map(([theme,count])=>({theme,count})).sort((a,b)=>b.count-a.count),golden:readings.filter(p=>p.golden).length,yes:readings.filter(p=>p.outcome==='yes').length};
}
