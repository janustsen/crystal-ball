type Painter=Pick<CanvasRenderingContext2D,'font'|'measureText'|'fillText'>;
const wrap=(ctx:Painter,text:string)=>{const lines:string[]=[];let line='';for(const word of text.split(' ')){if(ctx.measureText((line+' '+word).trim()).width<=820){line=(line+' '+word).trim();continue;}if(line){lines.push(line);line='';}for(const letter of word){if(ctx.measureText(line+letter).width>820){lines.push(line);line='';}line+=letter;}}if(line)lines.push(line);return lines;};
// lift raises the headlines to leave room for a body paragraph beneath them.
export function drawStoryHeadlines(ctx:Painter,text:string[],family:string,lift=0):number{
  ctx.font=`82px ${family}, Georgia`;
  const headlines=text.map(headline=>headline.replace(/(\d+)\s+(months?|years?|weeks?|days?)/gi,'$1 $2')),maxLines=headlines.length>1?6:3;
  const top=(blocks:string[][])=>(blocks.flat().length>3?940:1080)-lift;
  const bottom=(blocks:string[][],font:number)=>top(blocks)+(blocks.flat().length-1)*font*1.25+(blocks.length-1)*font*.5;
  let font=82,blocks=headlines.map(h=>wrap(ctx,h));while((blocks.flat().length>maxLines||bottom(blocks,font)>1270-lift)&&font>2){font-=2;ctx.font=`${font}px ${family}, Georgia`;blocks=headlines.map(h=>wrap(ctx,h));}
  let y=top(blocks);for(const block of blocks){for(const line of block){ctx.fillText(line,540,y);y+=font*1.25;}y+=font*.5;}return y-font*1.75;
}
// A paragraph under the headline (a portrait's text), shrunk until it ends above the wordmark; returns its last baseline.
export function drawStoryBody(ctx:Painter,text:string,top:number,family:string):number{
  let font=40,lines:string[];
  for(;;font-=2){ctx.font=`${font}px ${family}, Georgia`;lines=wrap(ctx,text);if(top+(lines.length-1)*font*1.4<=1500||font<=24)break;}
  lines.forEach((line,i)=>ctx.fillText(line,540,top+i*font*1.4));
  return top+(lines.length-1)*font*1.4;
}
