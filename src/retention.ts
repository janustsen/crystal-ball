import type {Prediction} from './types';
import type {Omen} from './daily-omen';

export function localDay(date = new Date()):string {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function checkInDate(value:string):Date|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const date=new Date(`${value}T12:00:00`);
 return Number.isFinite(date.getTime())&&localDay(date)===value?date:null;
}
export function suggestedCheckIn(p:Prediction):string {
 if(p.dueDate&&checkInDate(p.dueDate))return p.dueDate;
 const date=new Date(p.createdAt);date.setDate(date.getDate()+30);return localDay(date);
}

export function personalCheckInDue(p:Prediction,today=localDay()):boolean {
 return !p.circleId&&!p.outcome&&suggestedCheckIn(p)<=today;
}

export function personalCheckInDueToday(p:Prediction,today=localDay()):boolean {
 return personalCheckInDue(p,today)&&suggestedCheckIn(p)===today;
}

export function checkInLabel(p:Prediction,today=localDay()):string {
 if(p.circleId)return `Circle check-in · ${suggestedCheckIn(p)<=today?'Vote in Circles':suggestedCheckIn(p)}`;
 return p.outcome==='yes'?'Yes':p.outcome==='no'?'Not quite':p.outcome==='pending'?'Not yet':suggestedCheckIn(p)<=today?'Ready to check in':`Check back ${suggestedCheckIn(p)}`;
}

export function currentOmen(omen:Omen|null,today=localDay()):Omen|null {
 return omen?.day===today?omen:null;
}

// Calls onDay with the new local day when it changes, checked every minute and on return to the foreground.
export function watchLocalDay(onDay:(day:string)=>void,appState:{addEventListener:(type:'change',listener:(state:string)=>void)=>{remove:()=>void}}):()=>void {
 let day=localDay();
 const check=()=>{const next=localDay();if(next!==day){day=next;onDay(next)}};
 const timer=setInterval(check,60000),listener=appState.addEventListener('change',state=>{if(state==='active')check()});
 return ()=>{clearInterval(timer);listener.remove()};
}
