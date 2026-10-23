import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
// Settings shows every control at once, without scrolling, from the smallest supported iPhone (SE) to the largest,
// with daily notifications off and on, plus 115% rendered text on SE with notifications on.
// The starter balance is longer than the daily allowance; test both on SE.
// The largest accessibility sizes (including 200%) may scroll to keep every control reachable.
const base=process.env.PREVIEW_URL||'http://localhost:8087',out=process.env.EVIDENCE_DIR;
const phones=[['se',375,667],['mini',375,812],['17e',390,844],['pro-max',440,956],['se-115',375,667,1.15],['se-starter',375,667,1,0],['se-starter-115',375,667,1.15,0]];
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{
 for(const [name,width,height,scale=1,asked=20] of phones){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try{
   await context.addInitScript(asked=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{current_focus:'Writing my draft'},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:true,ladder:{asked,opened:['history','about','insight','bond','sky','library']},onboardingDone:true,ageConfirmed:true})),asked);
   const page=await context.newPage();
   await page.goto(base,{timeout:120000});
   await page.getByTestId('open-settings').click();
   for(const daily of (scale===1?[false,true]:[true])){
    const toggle=page.getByTestId('notify-toggle');
    if(await toggle.getAttribute('aria-checked')!==String(daily))await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked',String(daily));
    await page.waitForTimeout(600);
    if(scale!==1)await page.evaluate(scale=>{
     const sizes=[...document.querySelectorAll('*')].map(el=>{const style=getComputedStyle(el);return [el,parseFloat(style.fontSize),parseFloat(style.lineHeight)]});
     for(const [el,font,line] of sizes){el.style.fontSize=`${font*scale}px`;if(Number.isFinite(line))el.style.lineHeight=`${line*scale}px`}
    },scale);
    const overflow=await toggle.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(['auto','scroll'].includes(getComputedStyle(p).overflowY))return p.scrollHeight-p.clientHeight;return 0});
    assert.ok(overflow<=1,`${name} daily=${daily}: settings scroll by ${overflow}px`);
    const title=page.getByRole('heading',{name:'Settings',exact:true});
    assert.ok(await title.evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${name}: Settings title is not truncated`);
    const links=['Privacy policy','Terms of use','Support and reports'].map(name=>page.getByRole('button',{name,exact:true}));
    const controls=[toggle,page.getByTestId('ambient-sound'),page.getByRole('switch',{name:'Reduce motion'}),...links,page.getByTestId('privacy-and-entertainment'),page.getByTestId('forget-everything'),page.getByTestId('you-footer'),...(daily?['08:30','12:30','18:00'].map(time=>page.getByTestId(`notify-time-${time}`)):[])];
    const bar=await page.getByRole('tablist').count()?await page.getByRole('tablist').boundingBox():{y:height};
    for(const control of controls){
     const box=await control.boundingBox(),id=await control.getAttribute('data-testid');
     assert.ok(box&&box.y>=0&&box.y+box.height<=bar.y,`${name} daily=${daily}: ${id||await control.getAttribute('aria-label')} sits above the tab bar`);
     if(id!=='you-footer')assert.ok(box.width>=44&&box.height>=44,`${name}: Settings controls keep 44pt touch targets`);
    }
    if(daily){
     const chips=await Promise.all(['08:30','12:30','18:00'].map(time=>page.getByTestId(`notify-time-${time}`).boundingBox()));
     assert.ok(chips.every(box=>box&&box.width>=44&&box.height>=44),`${name}: time chips keep 44pt touch targets`);
     assert.ok(chips.every(box=>Math.abs(box.y-chips[0].y)<1),`${name}: time chips stay on one row`);
    }
    if(out)await page.screenshot({path:`${out}/settings-${name}-${daily?'daily':'quiet'}.png`});
    results.push({name,width,height,daily,overflow});
   }
  }finally{await context.close()}
 }
 console.log(JSON.stringify(results));
}finally{await browser.close()}
