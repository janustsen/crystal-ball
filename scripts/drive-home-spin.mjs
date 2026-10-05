// Drives Home's drag-to-spin ball in headless Chrome: a drag turns the ball without opening a reading or scrolling,
// a cancelled drag leaves keyboard activation working, a tap still opens a reading, and reduced motion draws only while dragged.
// Run against a web preview: PREVIEW_URL=http://localhost:8087 node scripts/drive-home-spin.mjs
import {chromium} from 'playwright';
import sharp from 'sharp';
import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://localhost:8087';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results={};
async function home(options){
 const context=await browser.newContext({viewport:{width:390,height:844},...options});
 const page=await context.newPage();
 await page.addInitScript(()=>{window.drawCount=0;for(const c of [WebGLRenderingContext,WebGL2RenderingContext])for(const d of ['drawArrays','drawElements']){const o=c.prototype[d];c.prototype[d]=function(...a){window.drawCount++;return o.apply(this,a)}}});
 await page.goto(base);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
 const ball=page.getByTestId('hero-orb');await ball.waitFor();await page.waitForTimeout(1500);
 const box=await ball.boundingBox();
 return {page,ball,box,cx:box.x+box.width/2,cy:box.y+box.height/2,cdp:await context.newCDPSession(page),draws:()=>page.evaluate(()=>window.drawCount),reading:()=>page.getByTestId('type-instead').isVisible()};
}
const pixels=async(page,box)=>(await sharp(await page.screenshot({clip:box})).raw().toBuffer());
const diff=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
try{
 // Reduced motion: the still ball redraws only while the hand turns it.
 {const h=await home({reducedMotion:'reduce'});
  const d0=await h.draws(),before=await pixels(h.page,h.box);await h.page.waitForTimeout(600);
  assert.equal(await h.draws(),d0,'reduced motion draws while idle');
  await h.page.mouse.move(h.cx,h.cy);await h.page.mouse.down();
  for(let i=1;i<=10;i++){await h.page.mouse.move(h.cx+i*12,h.cy);await h.page.waitForTimeout(30)}
  await h.page.mouse.up();await h.page.waitForTimeout(400);
  const d1=await h.draws(),turned=diff(before,await pixels(h.page,h.box));
  assert.ok(d1>d0,'a drag redraws under reduced motion');
  assert.ok(turned>4,`the drag turned the ball (mean pixel change ${turned})`);
  await h.page.waitForTimeout(600);assert.equal(await h.draws(),d1,'reduced motion keeps drawing after release');
  assert.equal(await h.reading(),false,'a drag opened a reading');
  results.reducedMotion={turned:+turned.toFixed(1)};
  await h.page.context().close()}
 // Touch: a drag neither scrolls nor opens a reading; a cancelled drag still lets Enter open one.
 {const h=await home({isMobile:true,hasTouch:true});
  const scroll=()=>h.page.evaluate(()=>[...document.querySelectorAll('*')].reduce((s,n)=>s+n.scrollTop,0)),s0=await scroll();
  const touch=async(end)=>{await h.cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:h.cx,y:h.cy}]});
   for(let i=1;i<=10;i++){await h.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:h.cx+i*8,y:h.cy-i*10}]});await h.page.waitForTimeout(16)}
   await h.cdp.send('Input.dispatchTouchEvent',{type:end,touchPoints:[]});await h.page.waitForTimeout(800)};
  await touch('touchEnd');
  assert.equal(await scroll(),s0,'a touch drag scrolled the page');
  assert.equal(await h.reading(),false,'a touch drag opened a reading');
  await touch('touchCancel');
  await h.ball.focus();await h.page.keyboard.press('Enter');
  await h.page.getByTestId('type-instead').waitFor({timeout:8000});
  results.touch='drag kept the page still; Enter after a cancelled drag opened a reading';
  await h.page.context().close()}
 // Mouse: a drag does not open a reading; a plain tap does.
 {const h=await home({});
  await h.page.mouse.move(h.cx,h.cy);await h.page.mouse.down();
  for(let i=1;i<=10;i++){await h.page.mouse.move(h.cx+i*10,h.cy+i*2);await h.page.waitForTimeout(16)}
  await h.page.mouse.up();await h.page.waitForTimeout(800);
  assert.equal(await h.reading(),false,'a mouse drag opened a reading');
  await h.ball.click();await h.page.getByTestId('type-instead').waitFor({timeout:8000});
  results.mouse='drag did not open a reading; tap did';
  await h.page.context().close()}
 console.log(JSON.stringify(results));
}finally{await browser.close()}
