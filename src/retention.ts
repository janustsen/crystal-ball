import type {Prediction} from './types';

export const omens = [
 'A small beginning will find room to grow.',
 'An unexpected conversation may open a door.',
 'Something familiar will look different today.',
 'A little patience will reveal the next step.',
 'Follow the curiosity you almost dismissed.',
 'A quiet moment may bring a useful answer.',
 'Make room for one pleasant surprise.',
 'The overlooked detail may be the interesting one.',
 'A simple kindness will travel further than you think.',
 'Your next idea may arrive on a different path.',
 'Something unfinished is ready for a small step.',
 'Let a little wonder into the ordinary.',
] as const;
export function localDay(date = new Date()):string {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function dailyOmen(date = new Date()):{day:string;text:string} {
 const day=localDay(date), index=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
 return {day,text:omens[((index%omens.length)+omens.length)%omens.length]};
}
export function checkInDate(value:string):Date|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const date=new Date(`${value}T12:00:00`);
 return Number.isFinite(date.getTime())&&localDay(date)===value?date:null;
}
export function suggestedCheckIn(p:Prediction):string {
 if(p.checkInOn)return p.checkInOn;
 const date=new Date(p.createdAt);
 const duration=p.headline.match(/\b(?:in|within|for the next) (\d+|a|an|one|six) (days?|weeks?|months?|years?)\b/i);
 const amount=duration ? ({a:1,an:1,one:1,six:6}[duration[1].toLowerCase()]??Number(duration[1])) : 30;
 const unit=duration?.[2].toLowerCase()??'days';
 if(unit.startsWith('month')||unit.startsWith('year')){
  const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+amount*(unit.startsWith('year')?12:1));
  const last=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();date.setDate(Math.min(day,last));
 }else date.setDate(date.getDate()+amount*(unit.startsWith('week')?7:1));
 return localDay(date);
}
