export function forecastDueDate(horizon:string,now=new Date()):string {
 const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 const words:Record<string,string>={one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',a:'1',an:'1'};
 const text=horizon.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\b/g,w=>words[w]);
 const interval=text.match(/(?:in|within|over|next|for)\s+(\d+(?:\.\d+)?)\s+(days?|weeks?|months?|years?)/);
 const year=text.match(/\b(?:by|in) (20\d{2}|2100)\b/);
 if(interval){
  const amount=Number(interval[1]),unit=interval[2];
  if(unit.startsWith('day')||unit.startsWith('week'))date.setUTCDate(date.getUTCDate()+amount*(unit.startsWith('week')?7:1));
  else{const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+amount*(unit.startsWith('year')?12:1));const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,end));}
 }else if(year)date.setUTCFullYear(Number(year[1]),11,31);
 else if(/\b(?:this|later this|next) year\b/.test(text))date.setUTCFullYear(date.getUTCFullYear()+(/\bnext year\b/.test(text)?1:0),11,31);
 else if(/\b(?:this|next) month\b/.test(text))date.setUTCMonth(date.getUTCMonth()+(/\bnext month\b/.test(text)?2:1),0);
 else if(/\b(?:this|next) week\b/.test(text))date.setUTCDate(date.getUTCDate()+7-(date.getUTCDay()||7)+(/\bnext week\b/.test(text)?7:0));
 else date.setUTCDate(date.getUTCDate()+90);
 if(date.getTime()<=now.getTime())date.setTime(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1));
 return date.toISOString().slice(0,10);
}
