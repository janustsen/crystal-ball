import sharp from 'sharp';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
const exec=promisify(execFile);
const escape=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export async function animatedCard(headline:string):Promise<Buffer>{
 if(!headline.trim()||headline.length>110)throw new Error('Invalid share headline');
 const dir=await mkdtemp(join(process.cwd(),'.local/share-'));
 try{
  const words=headline.split(/\s+/),lines:string[]=[];let line='';for(const word of words){if((line+' '+word).length>24){lines.push(line);line=word}else line=(line+' '+word).trim()}if(line)lines.push(line);
  const svg=`<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#0B0620"/><stop offset=".5" stop-color="#2A1458"/><stop offset="1" stop-color="#0B0620"/></linearGradient><radialGradient id="orb" cx=".35" cy=".25"><stop stop-color="#F1DFFF"/><stop offset=".35" stop-color="#A77BFF"/><stop offset=".8" stop-color="#514378"/><stop offset="1" stop-color="#161B3C"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#bg)"/><circle cx="540" cy="720" r="240" fill="url(#orb)" stroke="#BFA2ED" stroke-width="3"/><ellipse cx="540" cy="720" rx="285" ry="95" fill="none" stroke="#F5C76B" opacity=".6" transform="rotate(-24 540 720)"/><g text-anchor="middle"><text x="540" y="370" font-family="sans-serif" font-size="40" fill="#F5C76B">Crystal Ball</text>${lines.map((s,i)=>`<text x="540" y="${1070+i*82}" font-family="Georgia" font-size="64" fill="#F7F1FF">${escape(s)}</text>`).join('')}<text x="540" y="1500" font-family="sans-serif" font-size="30" fill="#C4B8D8">Speculative forecast · not a guarantee</text></g></svg>`;
  const png=join(dir,'card.png'),video=join(dir,'card.mp4');await sharp(Buffer.from(svg)).png().toFile(png);
  await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-loop','1','-i',png,'-vf',"scale=1080:1920,zoompan=z='1.00+0.015*sin(on/25)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=100:s=1080x1920:fps=25,format=yuv420p",'-t','4','-c:v','libx264','-preset','veryfast','-movflags','+faststart',video],{timeout:60000});
  return await readFile(video);
 }finally{await rm(dir,{recursive:true,force:true});}
}
