import {measureTextContrast} from './measure-text-contrast.mjs';
import {skipPreviewOnboarding} from './skip-preview-onboarding.mjs';
// Phone layout proof. Omen copy is a fixture, not a model-quality claim.
import {chromium,webkit,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.HOME_EVIDENCE||'.local/home';
await mkdir(out,{recursive:true});
const browser=await (process.env.HOME_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({channel:'chrome',headless:true})),results=[],failures=[];
try {
 for(const [width,height] of [[390,844],[430,932]])for(const largeText of [false,true]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
  await context.addInitScript(large=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:true,largeText:large})),largeText);
  const page=await context.newPage();
  await page.route('**/engine',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(process.env.HOME_OMEN_UNAVAILABLE==='1'?{kind:'error',message:'Controlled unavailable omen'}:{kind:'ok',value:{text:'Tonight, the moon hints at a door you have not tried yet.'}})}));
  await page.goto(base);await skipPreviewOnboarding(page);await expect(page.getByTestId('hero-orb')).toBeVisible();await page.waitForTimeout(1000);
  const metrics=await page.evaluate(()=>{
   const orb=document.querySelector('[data-testid="hero-orb"]').getBoundingClientRect();
   const headline=document.querySelector('[data-testid=home-invitation]');
   const hs=getComputedStyle(headline),hr=headline.getBoundingClientRect();
   const omen=document.querySelector('[data-testid="daily-omen"]'),panel=omen.getBoundingClientRect();
   const omenFits=[...omen.children].every(child=>{const r=child.getBoundingClientRect();return r.left>=panel.left&&r.right<=panel.right&&r.top>=panel.top&&r.bottom<=panel.bottom});
   const whisper=document.querySelector('[data-testid="home-whisper"]')?.getBoundingClientRect();
   let clip=omen.parentElement;while(clip&&!/auto|scroll/.test(getComputedStyle(clip).overflowY))clip=clip.parentElement;
   const ask=document.querySelector('[data-testid="tab-ask"] .orb')?.getBoundingClientRect();
   const navigationClear=!!clip&&!!ask&&clip.getBoundingClientRect().bottom<=ask.top;
   return {omenLabelVisible:omen.firstElementChild.getBoundingClientRect().bottom<=document.querySelector('[data-testid=screen-scroll]').getBoundingClientRect().bottom,omenBottom:panel.bottom,readingBottom:document.querySelector('[data-testid=screen-scroll]').getBoundingClientRect().bottom,omenVisible:panel.bottom<=document.querySelector('[data-testid=screen-scroll]').getBoundingClientRect().bottom,navigationClear,omenFits,orbWidth:orb.width,orbCenter:orb.y+orb.height/2,headlineSize:hs.fontSize,headlineLines:hr.height/parseFloat(hs.lineHeight),whisperClear:!whisper||(whisper.bottom<=orb.top||whisper.top>=orb.bottom),decorativeWhisperPresent:!!whisper,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  let contrastChecks=0;for(let phase=0;phase<3;phase++){const samples=await measureTextContrast(page);contrastChecks+=samples.length;expect(samples.filter(sample=>sample.contrast<sample.required)).toEqual([]);await page.waitForTimeout(200)}
  results.push({width,height,largeText,...metrics,contrastChecks});
  await page.screenshot({path:`${out}/${width}-${largeText?'large':'normal'}.png`});
  if(metrics.orbWidth<width*.6||metrics.orbWidth>width*.7||!metrics.whisperClear||metrics.overflow||!metrics.omenFits||!metrics.omenLabelVisible||(!largeText&&!metrics.omenVisible)||!metrics.navigationClear||(!largeText&&metrics.headlineLines>2))failures.push({width,largeText,...metrics});
  await page.getByTestId('daily-omen').scrollIntoViewIfNeeded();await expect(page.getByTestId('daily-omen')).toBeInViewport({ratio:1});await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/${width}-${largeText?'large':'normal'}-omen.png`});
  if(process.env.HOME_OMEN_UNAVAILABLE==='1'){await page.getByTestId('omen-daily-limit').click();const policy=page.getByText('Today’s free omen attempt is used, even when no omen is saved. Try tomorrow. This is separate from your reading balance.',{exact:true});await policy.scrollIntoViewIfNeeded();await expect(policy).toBeInViewport({ratio:1});const bounds=await policy.boundingBox(),tabs=await page.getByRole('tablist').boundingBox();expect(bounds.y+bounds.height).toBeLessThanOrEqual(tabs.y);await page.screenshot({path:`${out}/${width}-${largeText?'large':'normal'}-policy.png`});}

  await context.close();
 }
}finally{await browser.close();await writeFile(`${out}/metrics.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2))}

if(failures.length)throw new Error(JSON.stringify(failures));
