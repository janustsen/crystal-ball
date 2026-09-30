import type {Prediction} from './types';

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
