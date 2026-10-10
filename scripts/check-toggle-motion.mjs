import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.goto(process.env.PREVIEW_URL||'http://localhost:8273');
 await page.getByTestId('skip-for-now').click();
 await page.getByTestId('confirm-age').click();
 await page.getByTestId('tab-you').click();
 const ambient=page.getByTestId('ambient-sound');
 await ambient.scrollIntoViewIfNeeded();
 await page.waitForTimeout(300);
 await page.clock.install();
 await page.clock.pauseAt(new Date());
 async function toggle(label,reduced){
  await ambient.evaluate(element=>{
   window.toggleMotionResult=(async()=>{
   const knob=element.firstElementChild.lastElementChild;
   const target=element.getAttribute('aria-checked')==='true'?0:20;
   const samples=[],start=performance.now();
   element.click();
   await new Promise(resolve=>{
    function frame(){
     samples.push(new DOMMatrixReadOnly(getComputedStyle(knob).transform).m41);
     if(performance.now()-start<450)requestAnimationFrame(frame);else resolve();
    }
    requestAnimationFrame(frame);
   });
   return {samples,target,checked:element.getAttribute('aria-checked')};
   })();
  });
  await page.clock.runFor(500);
  const result=await page.evaluate(()=>window.toggleMotionResult);
  assert.equal(result.checked,String(result.target===20),label+' changes state');
  assert.equal(result.samples.at(-1),result.target,label+' settles');
  const slides=result.samples.some(x=>x>0&&x<20);
  assert.equal(slides,!reduced,label+' respects motion preferences');
  console.log(label+': passed '+JSON.stringify(result.samples));
 }
 // Turning reduced motion on while the knob is moving must stop the slide and land it at once.
 async function flipMidSlide(label){
  const at=()=>ambient.evaluate(element=>new DOMMatrixReadOnly(getComputedStyle(element.firstElementChild.lastElementChild).transform).m41);
  const target=await ambient.getAttribute('aria-checked')==='true'?0:20;
  await ambient.click();
  await page.clock.runFor(60);
  const moving=await at();
  assert.ok(moving>0&&moving<20,label+' is mid-slide before the flip ('+moving+')');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);
  await page.clock.runFor(20);
  const landed=await at();
  assert.equal(landed,target,label+' lands at once');
  console.log(label+': passed '+JSON.stringify([moving,landed]));
 }
 await toggle('Initial OS preference',true);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForTimeout(100);
 await toggle('OS preference disabled live',false);
 await page.getByRole('switch',{name:'Reduce motion',exact:true}).click();
 await toggle('App preference enabled',true);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForTimeout(100);
 await page.getByRole('switch',{name:'Reduce motion',exact:true}).click();
 await toggle('OS preference overrides app setting',true);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForTimeout(100);
 await toggle('Both preferences disabled',false);
 await flipMidSlide('OS preference enabled mid-slide');
 await toggle('OS preference enabled live',true);
}finally{await browser.close()}
