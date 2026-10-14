import type {Prediction} from './types.ts';
import type {Candidate,PlanContext} from './ritual.ts';
import {localDay} from './retention.ts';

// Year ahead: twelve monthly forecasts written and sealed together; each opens on the 1st of its month,
// and its check-in falls on the 1st of the next, when the next ball opens.
export type SealedMonth={month:string;id:string;headline:string};
export type YearAhead={source:'purchase'|'yearly'}&({kind:'owned'}|{kind:'sealed';sealedAt:string;months:SealedMonth[]});
export type ShelfBall=SealedMonth&{state:'sealed'|'ready'|'opened'};
export const yearAheadMonths=12;

const shift=(month:string,by:number)=>{const date=new Date(`${month}-01T12:00:00Z`);date.setUTCMonth(date.getUTCMonth()+by);return date.toISOString().slice(0,7)};
// The twelve months from the given local day's month.
export const monthsFrom=(day:string)=>Array.from({length:yearAheadMonths},(_,i)=>shift(day.slice(0,7),i));
export const opensOn=(month:string)=>`${month}-01`;
export const monthName=(month:string,style:'long'|'short'='long')=>new Date(`${month}-15T12:00:00Z`).toLocaleString('en-US',{month:style,timeZone:'UTC'});

// The yearly plan includes Year ahead; an existing purchase or sealed set is kept.
export const grantYearly=(current:YearAhead|undefined):YearAhead=>current??{kind:'owned',source:'yearly'};

// Opened is derived from History, so the reveal, check-in and backup reuse the Forecast path.
export function shelf(year:YearAhead,history:Prediction[],today=localDay()):ShelfBall[]{
 if(year.kind!=='sealed')return [];
 return year.months.map(m=>({...m,state:history.some(p=>p.id===m.id)?'opened':opensOn(m.month)<=today?'ready':'sealed'}));
}

export function openedReading(year:Extract<YearAhead,{kind:'sealed'}>,m:SealedMonth,now=new Date()):Prediction{
 const sealed=new Date(year.sealedAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
 return {id:m.id,question:`What does ${monthName(m.month)} hold?`,headline:m.headline,dueDate:opensOn(shift(m.month,1)),createdAt:now.toISOString(),label:`Year ahead · ${monthName(m.month)}`,why:`Sealed on ${sealed} with the rest of your year ahead, and opened this month.`,facts:{},sources:[],assumptions:[],friend:false};
}

// A morning note on each later month's 1st. Weekly-class, so daily back-off never drops a monthly beat.
export function yearAheadCandidates({state}:PlanContext):Candidate[]{
 const year=state.yearAhead;
 if(year?.kind!=='sealed')return [];
 return year.months.slice(1).map(m=>({id:'year-ahead',day:opensOn(m.month),slot:'morning',priority:50,weekly:true,title:'Crystal Ball',body:`Your ${monthName(m.month)} ball is open.`,data:{ritual:'year-ahead'}}));
}
