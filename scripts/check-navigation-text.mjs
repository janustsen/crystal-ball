// Shared navigation must respect the app text preference and reserve measured space above its raised orb.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/navigation-text';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),samples=[];
try{
 for(const width of [360,390,430])for(const large of [false,true]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(large=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:true,largeText:large})),large);
  const page=await context.newPage();await page.goto(base);await page.getByTestId('tab-history').waitFor();await page.waitForTimeout(600);
  const metrics=await page.evaluate(()=>{
   const tabs=[...document.querySelectorAll('[role=tab]')].map(tab=>{const el=tab.lastElementChild,r=el.getBoundingClientRect(),b=tab.getBoundingClientRect();return {name:el.textContent,font:parseFloat(getComputedStyle(el).fontSize),height:r.height,contained:r.left>=b.left&&r.right<=b.right&&r.bottom<=b.bottom}});
   let clip=document.querySelector('[data-testid="daily-omen"]').parentElement;while(clip&&!/auto|scroll/.test(getComputedStyle(clip).overflowY))clip=clip.parentElement;
   const orb=document.querySelector('[data-testid="tab-ask"] .orb').getBoundingClientRect();
   return {tabs,navigationClear:clip.getBoundingClientRect().bottom<=orb.top};
  });samples.push({width,large,...metrics});await page.screenshot({path:`${out}/${width}-${large?'large':'normal'}.png`});await context.close();
 }
}finally{await browser.close();await writeFile(`${out}/navigation.json`,JSON.stringify(samples,null,2))}
for(const sample of samples){expect(sample.navigationClear).toBe(true);for(const tab of sample.tabs){expect(tab.contained).toBe(true);if(sample.large){const normal=samples.find(s=>s.width===sample.width&&!s.large).tabs.find(t=>t.name===tab.name);expect(tab.font).toBe(normal.font*2)}}}
console.log('All five tab labels scale 200% at 360/390/430; text and raised-orb clearance pass.');
