// Drives the Plus room unlocks in headless Chrome: the locked Inner Library door, the simulated Plus unlock, Home's
// push-in into the chamber, and every ball style on the live glass ball at Home and Ask, at rest and spun.
// Run against a web preview built with EXPO_PUBLIC_ROOM_ASSET_BASE: PREVIEW_URL=http://localhost:8087 node scripts/drive-plus-styles.mjs
// Screenshots land in PLUS_EVIDENCE (default .local/plus-evidence); crops of the ball sit beside them.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.PREVIEW_URL||'http://localhost:8087',out=process.env.PLUS_EVIDENCE||'.local/plus-evidence';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results={styles:{}},errors=[];
const room=page=>page.evaluate(()=>{
 const canvas=document.querySelector('canvas[width]');
 return {videos:[...document.querySelectorAll('video')].map(v=>({paused:v.paused,time:v.currentTime,loop:v.loop})),
  stills:[...document.querySelectorAll('img')].map(i=>i.src).filter(s=>/room|library/.test(s)).map(s=>s.split('/').pop().split('?')[0]),
  ball:canvas?.style.visibility==='visible'};
});
const ballShot=async(page,id,path)=>{
 const b=await page.getByTestId(id).boundingBox(),pad=b.width*.15;
 await page.screenshot({path,clip:{x:b.x-pad,y:b.y-pad,width:b.width+pad*2,height:b.height+pad*2}});
};
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${new URL(r.url()).pathname}`)});
 await page.goto(base);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
 await page.getByTestId('hero-orb').waitFor();
 await page.waitForTimeout(2500);
 await ballShot(page,'hero-orb',`${out}/classic-home.png`);

 // Locked: the door upsell over the You spot; the chamber stays closed.
 await page.getByTestId('room-inner-library').click();
 await page.getByTestId('inner-library-locked').waitFor();
 await page.waitForTimeout(2500);
 let state=await room(page);
 assert.ok(!state.stills.some(s=>s.startsWith('library')),'the locked door does not show the chamber');
 await page.screenshot({path:`${out}/library-locked.png`});
 results.locked=state.stills;

 await page.getByTestId('unlock-inner-library').click();
 await page.getByTestId('continue-with-plus-simulate').click();
 await page.getByTestId('close-flow').click();
 await page.getByTestId('inner-library-open').waitFor();

 // Home's entry pushes in through the arch to the tome and rests on the chamber's still.
 await page.getByTestId('tab-home').click();
 await page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>e.name.endsWith('/room/v2/home-library.mp4')),null,{timeout:60000});
 await page.waitForTimeout(2500);
 await page.getByTestId('room-inner-library').click();
 await page.waitForFunction(()=>{const v=document.querySelector('video:not([loop])');return v&&!v.paused&&v.currentTime>.3});
 const flight=await page.evaluate(async()=>{
  const v=document.querySelector('video:not([loop])');
  const bytes=await Promise.all([v.src,'/room/v2/home-library.mp4'].map(async u=>new Uint8Array(await (await fetch(u)).arrayBuffer())));
  return bytes[0].length===bytes[1].length&&bytes[0].every((b,i)=>b===bytes[1][i]);
 });
 assert.ok(flight,'the Inner Library entry plays the approved push-in');
 await page.screenshot({path:`${out}/library-pushin.png`});
 await page.waitForFunction(()=>!document.querySelector('video:not([loop])'),null,{timeout:5000});
 await page.waitForTimeout(500);
 state=await room(page);
 assert.ok(state.stills.some(s=>s.startsWith('library')),'the push-in lands on the chamber still');
 assert.equal(state.ball,false,'the chamber holds no live ball');
 await page.getByTestId('inner-library-open').waitFor();
 await page.screenshot({path:`${out}/library-open.png`});
 results.library={pushin:'home-library.mp4',rest:state.stills};

 for(const style of ['smoke','aurora','obsidian','gold','classic']){
  await page.getByTestId(`ball-style-${style}`).click();
  await page.waitForFunction(s=>JSON.parse(localStorage.getItem('crystal-ball-v1')).ballStyle===s,style);
  // A fresh load starts the ball unturned, so the rest captures compare with the style's render.
  await page.reload();await page.getByTestId('hero-orb').waitFor();await page.waitForTimeout(2500);
  await ballShot(page,'hero-orb',`${out}/${style}-home.png`);
  await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
  await page.waitForTimeout(2500);
  await ballShot(page,'ask-ball',`${out}/${style}-ask.png`);
  await page.getByTestId('close-flow').click();await page.waitForTimeout(2500);
  // A drag turns the style's interior with the ball, and does not read.
  const b=await page.getByTestId('hero-orb').boundingBox();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
  for(let i=1;i<=12;i++){await page.mouse.move(b.x+b.width/2+i*8,b.y+b.height/2+i*2);await page.waitForTimeout(16)}
  await page.mouse.up();await page.waitForTimeout(4000);
  assert.equal(await page.getByTestId('type-instead').count(),0,'a drag does not start a reading');
  await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
  await page.waitForTimeout(2500);
  await ballShot(page,'ask-ball',`${out}/${style}-spun.png`);
  await page.getByTestId('close-flow').click();
  await page.getByTestId('room-inner-library').click();
  await page.getByTestId('inner-library-open').waitFor();
  results.styles[style]='home, ask, spun';
 }
 await page.getByTestId('ball-style-aurora').click();
 await page.waitForTimeout(300);
 await page.screenshot({path:`${out}/library-picker.png`});

 // The share card paints the chosen style's render into its ball (a seeded saved reading, not a model pass).
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('crystal-ball-v1'));state.history=[{id:'0000000a-abcd-4000-8000-000000000000',question:'Will I finish my draft?',headline:'You will finish your first draft within 6 months.',createdAt:'2026-09-30T12:00:00Z',label:'Speculative forecast · not a guarantee',why:'A speculative scenario based on your plans.',facts:{},sources:[],assumptions:[],friend:false,golden:true}];localStorage.setItem('crystal-ball-v1',JSON.stringify(state))});
 await page.reload();await page.getByTestId('tab-history').click();
 await page.getByTestId('share-golden-set').click();
 const card=page.locator('img[src^="data:image/png"]').first();
 await card.waitFor();
 const tint=await card.evaluate(async img=>{
  const c=document.createElement('canvas');c.width=1080;c.height=1920;const g=c.getContext('2d');g.drawImage(img,0,0,1080,1920);
  const d=g.getImageData(400,410,280,280).data;let r=0,b=0;for(let i=0;i<d.length;i+=4){r+=d[i];b+=d[i+2]}return {r:r/(d.length/4),b:b/(d.length/4)};
 });
 assert.ok(tint.b>tint.r,`the aurora render fills the share card's ball ${JSON.stringify(tint)}`);
 await card.screenshot({path:`${out}/share-aurora.png`});
 results.share={style:'aurora',ballMean:tint};
 await context.close();
 assert.deepEqual(errors.filter(e=>!/room clip unavailable|favicon/.test(e)),[],'console errors');
 writeFileSync(`${out}/drive-plus-styles.json`,JSON.stringify(results,null,1)+'\n');
 console.log(JSON.stringify(results,null,1));
}finally{await browser.close()}
