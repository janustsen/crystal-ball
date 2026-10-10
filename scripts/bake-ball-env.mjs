// Bakes assets/room/ball-env.bin, the library room as the glass ball reflects and refracts it (scripts/ball-env-room.ts),
// by rendering the room in Chrome's WebGL2. Rerun whenever that room changes:  node scripts/bake-ball-env.mjs
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
const {outputFiles:[bundle]}=await build({entryPoints:['scripts/ball-env-room.ts'],bundle:true,write:false,format:'iife',globalName:'room'});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-gpu','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage();
 await page.addScriptTag({content:bundle.text});
 const base64=await page.evaluate(()=>{
  const bytes=new Uint8Array(room.bakeEnv(document.createElement('canvas')).buffer);
  let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(s);
 });
 const out=Buffer.from(base64,'base64');
 writeFileSync('assets/room/ball-env.bin',out);
 console.log(`assets/room/ball-env.bin: ${out.length} bytes`);
}finally{await browser.close()}
