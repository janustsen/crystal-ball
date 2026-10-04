// Preserve every word and authored paragraph boundary; split dense prose at sentence endings.
export function readingPassages(text:string):string[]{
 return text.split(/\n\s*\n/).map(part=>part.trim()).filter(Boolean).flatMap(paragraph=>{
  if(paragraph.length<=180)return [paragraph];
  const sentences:string[]=[];let start=0;
  for(let index=0;index<paragraph.length-1;index++)if(/[.!?]/.test(paragraph[index])&&/\s/.test(paragraph[index+1])){sentences.push(paragraph.slice(start,index+1).trim());start=index+1;}
  if(paragraph.slice(start).trim())sentences.push(paragraph.slice(start).trim());
  return sentences;
 });
}
