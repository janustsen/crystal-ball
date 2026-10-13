import {chromium,expect} from '@playwright/test';

const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  const request=window.requestAnimationFrame.bind(window);
  window.heldFrames=null;
  window.requestAnimationFrame=callback=>window.heldFrames
   ?request(time=>window.heldFrames?window.heldFrames.push(()=>callback(time)):callback(time))
   :request(callback);
 });
 await page.goto(process.env.PREVIEW_URL||'http://localhost:8087',{timeout:120000});
 await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
 if(await page.getByTestId('tour-skip').count())await page.getByTestId('tour-skip').click();
 await page.getByTestId('open-settings').click();
 const shell=page.getByTestId('app-shell');
 const toggle=page.getByRole('switch',{name:'Reduce motion',exact:true});
 const position=()=>page.locator('.atmosphere').evaluate(root=>({
  x:root.style.getPropertyValue('--px'),y:root.style.getPropertyValue('--py'),
  layers:['.sky','.embers','.candle'].map(selector=>getComputedStyle(root.querySelector(selector)).translate),
 }));
 const pointer=(type,fraction)=>shell.evaluate((element,{type,fraction})=>{
  const r=element.getBoundingClientRect();
  element.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:r.left+r.width*fraction,clientY:r.top+r.height*fraction}));
 },{type,fraction});
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 for(const preference of ['app','OS']){
  await pointer('pointermove',.1);await settle();
  const initial=await position();
  await pointer('pointermove',.9);await settle();
  const moving=await position();
  expect(moving.x).not.toBe(initial.x);expect(moving.y).not.toBe(initial.y);
  await page.evaluate(()=>{window.heldFrames=[]});
  await pointer('pointermove',.2);
  await page.waitForFunction(()=>window.heldFrames.length>0,undefined,{polling:10});
  if(preference==='app')await toggle.evaluate(element=>element.click());
  else await page.emulateMedia({reducedMotion:'reduce'});
  await expect(shell).toHaveAttribute('data-reduced','true');
  const frozen=await position();
  await page.evaluate(()=>{const frames=window.heldFrames;window.heldFrames=null;frames.forEach(frame=>frame())});
  await settle();
  expect(await position()).toEqual(frozen);
  for(const type of ['pointermove','pointerdown']){
   await pointer(type,.1);await settle();expect(await position()).toEqual(frozen);
   await pointer(type,.9);await settle();expect(await position()).toEqual(frozen);
  }
  if(preference==='app')await toggle.evaluate(element=>element.click());
  else await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(shell).toHaveAttribute('data-reduced','false');
  await pointer('pointerdown',.3);await settle();
  const resumed=await position();
  expect(resumed.x).not.toBe(frozen.x);expect(resumed.y).not.toBe(frozen.y);
  console.log(`${preference}: pending frame suppressed, both pointer paths frozen, both axes resume`);
 }
}finally{await browser.close()}
