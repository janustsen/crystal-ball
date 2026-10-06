// Drives the rendered room in headless Chrome: Home rests on its loop, streamed clips prefetch, each tab flies to its
// spot and lands on that spot's loop, the live ball tracks the render's ring stand, and reduced motion fades stills.
// Run against a web preview built with EXPO_PUBLIC_ROOM_ASSET_BASE: PREVIEW_URL=http://localhost:8087 node scripts/drive-room.mjs
// Screenshots land in ROOM_EVIDENCE (default .local/room-evidence).
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.PREVIEW_URL||'http://localhost:8087',out=process.env.ROOM_EVIDENCE||'.local/room-evidence';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results={},errors=[];
const room=page=>page.evaluate(()=>{
 const videos=[...document.querySelectorAll('video')].map(v=>({src:v.src.slice(0,5),time:+v.currentTime.toFixed(2),paused:v.paused,ended:v.ended}));
 const canvas=document.querySelector('canvas[width]');
 const b=canvas?.getBoundingClientRect();
 return {videos,stills:document.querySelectorAll('img[src*="room"]').length,fading:!!document.querySelector('img[data-room-fade]'),
  ball:canvas&&canvas.style.visibility==='visible'?{x:b.x+b.width/2,y:b.y+b.height/2,filter:canvas.style.filter}:null};
});
async function open(options){
 const context=await browser.newContext({viewport:{width:390,height:844},...options});
 const page=await context.newPage();
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(base);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
 await page.getByTestId('hero-orb').waitFor();
 return page;
}
const centre=async locator=>{const b=await locator.boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2}};
// The loops drift the camera a few pixels; the ball follows the render's ring while the touch target stays put.
const near=(a,b,label)=>assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<8,`${label}: ball ${JSON.stringify(a)} vs target ${JSON.stringify(b)}`);
try{
 // Optional isolated route mounts the real RoomScene with all five controls, including outgoing Ask flights.
 if(process.env.ROOM_SCENE_URL){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  // Cache writes can finish before the app has made playable URLs for the downloaded blobs.
  await page.addInitScript(()=>{
   window.roomVideosReady=0;
   const create=URL.createObjectURL.bind(URL);
   URL.createObjectURL=blob=>{const url=create(blob);if(blob.type==='video/mp4')window.roomVideosReady++;return url};
  });
  await page.goto(process.env.ROOM_SCENE_URL);
  await page.waitForFunction(()=>window.roomVideosReady===25,null,{timeout:60000});
  const loop=()=>page.waitForFunction(()=>{
   const videos=[...document.querySelectorAll('video')];return videos.length===1&&videos[0].loop&&!videos[0].paused&&videos[0].currentTime>0;
  });
  const matches=async path=>page.evaluate(async path=>{
   const video=document.querySelector('video:not([loop])')||document.querySelector('video');
   const bytes=await Promise.all([video.src,path].map(async url=>new Uint8Array(await (await fetch(url)).arrayBuffer())));
   return bytes[0].length===bytes[1].length&&bytes[0].every((byte,i)=>byte===bytes[1][i]);
  },path);
  await loop();
  const homeLoop=await page.locator('video').getAttribute('src');
  results.pairs=[];
  let current='Home';
  for(const from of ['Home','Sky','Ask','History','You'])for(const to of ['Home','Sky','Ask','History','You']){
   if(from===to)continue;
   console.log(`Room flight: ${from} → ${to}`);
   if(current!==from){
    await page.getByTestId(`spot-${from}`).click();
    await page.waitForFunction(()=>document.querySelector('video:not([loop])'));
    await loop();
   }
   await page.getByTestId(`spot-${to}`).click();
   await page.waitForFunction(()=>{const v=document.querySelector('video:not([loop])');return v&&!v.paused&&v.currentTime>0});
   const key=`${from.toLowerCase()}-${to.toLowerCase()}`;
   assert.ok(await matches(`/room/v2/${key}.mp4`),`${key} plays the approved flight`);
   await page.screenshot({path:`${out}/pair-${key}.png`});
   await loop();
   assert.ok(await matches(to==='Home'?homeLoop:`/room/v2/idle-${to.toLowerCase()}.mp4`),`${key} lands on the destination loop`);
   const before=await page.locator('video').evaluate(v=>v.currentTime);
   await page.waitForTimeout(200);
   assert.notEqual(await page.locator('video').evaluate(v=>v.currentTime),before,`${key} landing loop advances`);
   results.pairs.push(key);
   current=to;
  }
  assert.equal(results.pairs.length,20);
  await context.close();
 }
 {const page=await open();
  await page.waitForTimeout(2500);
  let state=await room(page);
  assert.ok(state.videos.some(v=>v.src==='blob:'&&!v.paused),'Home rests on its living loop');
  near(state.ball,await centre(page.getByTestId('hero-orb')),'Home');
  await page.screenshot({path:`${out}/home.png`});
  // Every streamed clip is fetched in the background.
  await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/room/v')).length>=24,null,{timeout:60000});
  results.prefetched=await page.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/room/v')).length);
  for(const [tab,back] of [['sky','home'],['history','sky'],['you','history'],['home','you']]){
   await page.getByTestId(`tab-${tab}`).click();
   await page.waitForTimeout(700);
   state=await room(page);
   assert.ok(state.videos.some(v=>v.src==='blob:'&&v.time>0&&v.time<1.5),`${back}→${tab} plays its flight`);
   await page.screenshot({path:`${out}/flight-${back}-${tab}.png`});
   await page.waitForTimeout(2500);
   state=await room(page);
   assert.equal(state.videos.length,1,`${tab} rests on one loop`);
   await page.screenshot({path:`${out}/${tab}.png`});
   results[tab]={ball:!!state.ball};
  }
  // Ask: flight from Home, the ball lands in its ring under the question.
  await page.getByTestId('tab-ask').click();
  await page.waitForTimeout(600);await page.screenshot({path:`${out}/flight-home-ask.png`});
  await page.getByTestId('type-instead').click();
  await page.waitForTimeout(2500);
  state=await room(page);
  near(state.ball,await centre(page.getByTestId('ask-ball')),'Ask');
  await page.screenshot({path:`${out}/ask.png`});
  results.ask={ball:state.ball};
  await page.context().close()}
 // Reduced motion: no flights or loops, a tab change fades between stills.
 {const page=await open({reducedMotion:'reduce'});
  await page.waitForTimeout(1500);
  let state=await room(page);
  assert.equal(state.videos.length,0,'reduced motion plays no loop');
  await page.getByTestId('tab-history').click();
  await page.waitForTimeout(150);
  state=await room(page);
  assert.equal(state.videos.length,0,'reduced motion plays no flight');
  assert.ok(state.fading,'reduced motion fades between stills');
  await page.waitForTimeout(800);
  assert.equal((await room(page)).fading,false,'the fade finishes');
  await page.screenshot({path:`${out}/reduced-history.png`});
  results.reduced='fade';
  await page.context().close()}
 // A golden reveal (seeded saved reading, not a model pass) rings the room's Ask ball with the gold halo.
 {const page=await open();
  await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('crystal-ball-v1'));state.history=[{id:'0000000a-abcd-4000-8000-000000000000',question:'Will I finish my draft?',headline:'You will finish your first draft within 6 months.',createdAt:'2026-09-30T12:00:00Z',label:'Speculative forecast · not a guarantee',why:'A speculative scenario based on your plans.',facts:{},sources:[],assumptions:[],friend:false,golden:true}];localStorage.setItem('crystal-ball-v1',JSON.stringify(state))});
  await page.reload();await page.getByTestId('tab-history').click();
  await page.getByTestId('golden-shelf-item-0000000a-abcd-4000-8000-000000000000').click();
  await page.getByTestId('golden-label').waitFor();await page.waitForTimeout(2500);
  near(await centre(page.getByTestId('golden-glow')),await centre(page.getByTestId('ask-ball')),'Golden halo');
  await page.screenshot({path:`${out}/golden-reveal.png`});
  results.golden='halo on the Ask ball';
  await page.context().close()}
 assert.deepEqual(errors.filter(e=>!/room clip unavailable|favicon/.test(e)),[],'console errors');
 writeFileSync(`${out}/drive-room.json`,JSON.stringify(results,null,1)+'\n');
 console.log(JSON.stringify(results,null,1));
}finally{await browser.close()}
