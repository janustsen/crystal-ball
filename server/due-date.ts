import type {Facts} from '../src/types.ts';

export function forecastDueDate(question:string,facts:Facts,now=new Date()):string {
 const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 const text=[facts.horizon,facts.deadline,facts.years?`in ${facts.years} years`:'',facts.growth_weeks?`in ${facts.growth_weeks} weeks`:'',question].filter(Boolean).join(' ').toLowerCase().replace(/\b(one|a|an)\b/g,'1').replace(/\bthree\b/g,'3').replace(/\bfour\b/g,'4').replace(/\bsix\b/g,'6').replace(/\bten\b/g,'10');
 const interval=text.match(/(?:in|within|over|next)\s+(\d+)\s+(days?|weeks?|months?|years?)/);
 const year=text.match(/\b(?:by|in) (20\d{2})\b/);
 if(interval){
  const amount=Math.min(Number(interval[1]),100),unit=interval[2];
  if(unit.startsWith('day')||unit.startsWith('week'))date.setUTCDate(date.getUTCDate()+amount*(unit.startsWith('week')?7:1));
  else{const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+amount*(unit.startsWith('year')?12:1));const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,end));}
 }else if(year)date.setUTCFullYear(Number(year[1]),11,31);
 else if(/\b(?:this|later this|next) year\b/.test(text))date.setUTCFullYear(date.getUTCFullYear()+(/\bnext year\b/.test(text)?1:0),11,31);
 else if(/\b(?:this|next) month\b/.test(text))date.setUTCMonth(date.getUTCMonth()+(/\bnext month\b/.test(text)?2:1),0);
 else if(/\bthis week\b/.test(text))date.setUTCDate(date.getUTCDate()+7-(date.getUTCDay()||7));
 else date.setUTCDate(date.getUTCDate()+90);
 if(date.getTime()<=now.getTime())date.setTime(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1));
 return date.toISOString().slice(0,10);
}
