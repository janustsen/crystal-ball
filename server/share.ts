import sharp from 'sharp';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const exec=promisify(execFile);
export async function animatedCard(image:string):Promise<Buffer>{
 if(!image.startsWith('data:image/png;base64,')||image.length>2_000_000)throw new Error('Invalid share image');
 const bytes=Buffer.from(image.slice('data:image/png;base64,'.length),'base64');
 const metadata=await sharp(bytes,{limitInputPixels:3_000_000}).metadata();
 if(metadata.width!==1080||metadata.height!==1920)throw new Error('Share image must be1080×1920');
 const dir=await mkdtemp(join(tmpdir(),'crystal-ball-share-'));
 try{
  const png=join(dir,'card.png'),video=join(dir,'card.mp4');await sharp(bytes).png().toFile(png);
  await exec('ffmpeg',['-hide_banner','-loglevel','error','-y','-loop','1','-i',png,'-vf',"scale=1080:1920,zoompan=z='1.00+0.025*(1-cos(2*PI*on/100))':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=100:s=1080x1920:fps=25,format=yuv420p",'-t','4','-c:v','libx264','-preset','veryfast','-movflags','+faststart',video],{timeout:60000});
  return await readFile(video);
 }finally{await rm(dir,{recursive:true,force:true});}
}
