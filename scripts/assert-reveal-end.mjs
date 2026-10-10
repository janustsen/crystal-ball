import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';

// Compare the decoded final title region with the public end-card design, not duration metadata.
export async function assertRevealEnd(page,file,evidence){
 const width=900,height=110,size=width*height;
 const frames=execFileSync('ffmpeg',['-v','error','-i',file,'-an','-vf',`crop=${width}:${height}:90:1030,format=gray`,'-f','rawvideo','pipe:1'],{maxBuffer:128*1024*1024});
 assert.ok(frames.length>=size,'Clip must contain a decoded video frame');
 const last=frames.subarray(-size);
 await sharp(last,{raw:{width,height,channels:1}}).png().toFile(evidence);
 // The end card sets its title on the app's ground.
 const reference=await page.evaluate(async({width,height})=>{
  await document.fonts.load('76px IMFellEnglish');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#140E0A';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#F4EBDD';ctx.textAlign='center';ctx.font='76px IMFellEnglish, Georgia';ctx.fillText('search Crystal Ball',450,90);
  return canvas.toDataURL();
 },{width,height});
 const expected=await sharp(Buffer.from(reference.split(',')[1],'base64')).removeAlpha().greyscale().raw().toBuffer();
 const error=last.reduce((sum,value,i)=>sum+Math.abs(value-expected[i]),0)/size;
 assert.ok(error<5,`Decoded last frame must show “search Crystal Ball” on the ground (pixel error ${error.toFixed(2)})`);
 return {endCardPixelError:error};
}
