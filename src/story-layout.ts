export function drawStoryHeadlines(ctx:Pick<CanvasRenderingContext2D,'font'|'measureText'|'fillText'>,text:string[],family:string):number{
  ctx.font=`82px ${family}, Georgia`;
  const headlines=text.map(headline=>headline.replace(/(\d+)\s+(months?|years?|weeks?|days?)/gi,'$1\u00a0$2')),maxLines=headlines.length>1?6:3;
  const wrap=(text:string)=>{const lines:string[]=[];let line='';for(const word of text.split(' ')){if(ctx.measureText((line+' '+word).trim()).width<=820){line=(line+' '+word).trim();continue;}if(line){lines.push(line);line='';}for(const letter of word){if(ctx.measureText(line+letter).width>820){lines.push(line);line='';}line+=letter;}}if(line)lines.push(line);return lines;};
  const bottom=(blocks:string[][],font:number)=>(blocks.flat().length>3?940:1080)+(blocks.flat().length-1)*font*1.25+(blocks.length-1)*font*.5;
  let font=82,blocks=headlines.map(wrap);while((blocks.flat().length>maxLines||bottom(blocks,font)>1270)&&font>2){font-=2;ctx.font=`${font}px ${family}, Georgia`;blocks=headlines.map(wrap);}
  let y=blocks.flat().length>3?940:1080;for(const block of blocks){for(const line of block){ctx.fillText(line,540,y);y+=font*1.25;}y+=font*.5;}return y-font*1.75;
}
