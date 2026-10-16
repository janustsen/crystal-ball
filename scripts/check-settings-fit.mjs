import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
// Settings shows every control at once, without scrolling, from the smallest supported iPhone (SE) to the largest,
// with daily notifications off and on (their time chips). 200% text may scroll; it is not checked here.
const base=process.env.PREVIEW_URL||'http://localhost:8087',out=process.env.EVIDENCE_DIR;
const phones=[['se',375,667],['mini',375,812],['17e',390,844],['pro-max',440,956]];
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{
 for(const [name,width,height] of phones){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try{
   await context.addInitScript(()=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{current_focus:'Writing my draft'},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:true,largeText:false,tourSeen:true,onboardingDone:true,ageConfirmed:true})));
   const page=await context.newPage();
   await page.goto(base,{timeout:120000});
   await page.getByTestId('open-settings').click();
   for(const daily of [false,true]){
    const toggle=page.getByTestId('notify-toggle');
    if(await toggle.getAttribute('aria-checked')!==String(daily))await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked',String(daily));
    await page.waitForTimeout(600);
    const controls=[toggle,page.getByTestId('ambient-sound'),page.getByRole('switch',{name:'Reduce motion'}),page.getByRole('switch',{name:'Large text'}),page.getByTestId('take-the-tour'),page.getByTestId('privacy-and-entertainment'),page.getByTestId('forget-everything'),page.getByTestId('you-footer'),...(daily?[page.getByTestId('notify-time-08:30')]:[])];
    const bar=await page.getByRole('tablist').boundingBox();
    for(const control of controls){const box=await control.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=bar.y,`${name} daily=${daily}: ${await control.evaluate(el=>el.dataset.testid||el.getAttribute('aria-label'))} sits above the tab bar`)}
    const overflow=await toggle.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(['auto','scroll'].includes(getComputedStyle(p).overflowY))return p.scrollHeight-p.clientHeight;return 0});
    assert.ok(overflow<=1,`${name} daily=${daily}: settings scroll by ${overflow}px`);
    if(out)await page.screenshot({path:`${out}/settings-${name}-${daily?'daily':'quiet'}.png`});
    results.push({name,width,height,daily,overflow});
   }
  }finally{await context.close()}
 }
 console.log(JSON.stringify(results));
}finally{await browser.close()}
