// Preserve authored paragraphs; add reading breaks to otherwise long model prose.
export function readingPassages(text:string):string[]{
 const paragraphs=text.split(/\n\s*\n/).map(part=>part.trim()).filter(Boolean);
 if(paragraphs.length!==1||text.length<=360)return paragraphs;
 const sentences:string[]=[];let start=0;
 for(let index=0;index<text.length-1;index++)if(/[.!?]/.test(text[index])&&/\s/.test(text[index+1])){sentences.push(text.slice(start,index+1).trim());start=index+1;}
 if(text.slice(start).trim())sentences.push(text.slice(start).trim());
 const passages:string[]=[];for(let index=0;index<sentences.length;index+=2)passages.push(sentences.slice(index,index+2).join(' '));
 return passages;
}
