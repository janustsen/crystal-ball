import type { Source } from '../src/types.ts';
function unescape(s:string){return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
export async function research(question:string):Promise<Source[]> {
 // Prototype headline leads only; no claim to full-article research or commercial RSS rights.
 const response=await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(question)}&hl=en-US&gl=US&ceid=US:en`,{signal:AbortSignal.timeout(8000)});
 if(!response.ok)return [];
 const xml=await response.text(),seen=new Set<string>(),now=Date.now();
 return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([,item])=>{
  const get=(tag:string)=>unescape(item.match(new RegExp(`<${tag}(?: [^>]*)?>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g,'')||'');
  const title=get('title'),url=get('link'),date=get('pubDate'),publisher=get('source'),key=title.split(' - ')[0].toLowerCase();
  const age=now-Date.parse(date),terms=(question.toLowerCase().match(/[a-z]{2,}/g)||[]).filter(t=>!['will','what','when','where','who','how','the','my','be','in','next','this','year','years','me','have','more','than','do','to','of','a','an'].includes(t));
  if(!/^https:\/\/news\.google\.com\//.test(url)||!Number.isFinite(age)||age<0||age>180*86400000||seen.has(key)||terms.filter(t=>key.includes(t)).length<Math.min(2,terms.length)||terms.length===0)return [];
  seen.add(key);return [{title,url,date,publisher}];
 }).slice(0,3);
}
