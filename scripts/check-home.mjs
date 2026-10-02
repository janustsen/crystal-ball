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
  await page.route('**/engine',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({kind:'ok',value:{text:'Tonight, the moon hints at a door you have not tried yet.'}})}));
  await page.goto(base);await expect(page.getByTestId('hero-orb')).toBeVisible();await page.waitForTimeout(1000);
  const metrics=await page.evaluate(()=>{
   const orb=document.querySelector('[data-testid="hero-orb"]').getBoundingClientRect();
   const headline=[...document.querySelectorAll('div')].find(e=>e.textContent==='Touch the ball. Ask what’s ahead.');
   const hs=getComputedStyle(headline),hr=headline.getBoundingClientRect();
   const whisper=document.querySelector('[data-testid="home-whisper"]')?.getBoundingClientRect();
   return {orbWidth:orb.width,orbCenter:orb.y+orb.height/2,headlineSize:hs.fontSize,headlineLines:hr.height/parseFloat(hs.lineHeight),whisperClear:!!whisper&&(whisper.bottom<=orb.top||whisper.top>=orb.bottom),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  results.push({width,height,largeText,...metrics});
  await page.screenshot({path:`${out}/${width}-${largeText?'large':'normal'}.png`});
  if(metrics.orbWidth<width*.6||metrics.orbWidth>width*.7||!metrics.whisperClear||metrics.overflow||(!largeText&&metrics.headlineLines>2))failures.push({width,largeText,...metrics});
  await context.close();
 }
}finally{await browser.close();await writeFile(`${out}/metrics.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2))}

if(failures.length)throw new Error(JSON.stringify(failures));
