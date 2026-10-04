import {localDay} from './retention';
export function forecastDueDate(horizon:string,now:Date|string=new Date()):string {
 const date=new Date((typeof now==='string'?now:localDay(now))+'T00:00:00Z'),start=date.getTime();
 const words:Record<string,string>={one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',a:'1',an:'1'};
 const text=horizon.trim().toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\b/g,w=>words[w]);
 const interval=text.match(/^(?:(?:in|within|over|next|for)\s+)?(\d+(?:\.\d+)?)\s+(days?|weeks?|months?|years?)$/);
 const year=text.match(/^(?:by|in) (20\d{2}|2100)$/);
 if(interval){
  const amount=Number(interval[1]),unit=interval[2];
  if(amount<=0||!Number.isInteger(amount))throw new Error('Use a positive timeframe with whole days, weeks, months or years.');
  if(unit.startsWith('day')||unit.startsWith('week'))date.setUTCDate(date.getUTCDate()+amount*(unit.startsWith('week')?7:1));
  else{const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+amount*(unit.startsWith('year')?12:1));const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,end));}
 }else if(text==='tomorrow')date.setUTCDate(date.getUTCDate()+1);
 else if(year)date.setUTCFullYear(Number(year[1]),11,31);
 else if(/^(?:this|later this|next) year$/.test(text))date.setUTCFullYear(date.getUTCFullYear()+(/\bnext year\b/.test(text)?1:0),11,31);
 else if(/^(?:this|next) month$/.test(text))date.setUTCMonth(date.getUTCMonth()+(/\bnext month\b/.test(text)?2:1),0);
 else if(/^(?:this|next) week$/.test(text))date.setUTCDate(date.getUTCDate()+7-(date.getUTCDay()||7)+(/\bnext week\b/.test(text)?7:0));
 else throw new Error('Use a timeframe such as tomorrow, next week, in 3 months, or by 2030.');
 if(!Number.isFinite(date.getTime())||date.getTime()<start)throw new Error('Use a current or future timeframe.');
 return date.toISOString().slice(0,10);
}

// Forecast horizons can be longer; the first check-in always falls within a year.
export function checkInDueDate(horizon:string,now:Date|string=new Date()):string {
 const chosen=forecastDueDate(horizon,now),earliest=forecastDueDate('in 1 day',now),latest=forecastDueDate('in 1 year',now);
 return chosen<earliest?earliest:chosen>latest?latest:chosen;
}
