// Fresh browser processes replay a recorded actual reading; no new model inference.
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const out=process.env.UX_EVIDENCE||'.local/share-motion-repeat';await mkdir(out,{recursive:true});
const logs=JSON.parse(await readFile(process.env.READING_EVIDENCE||'docs/ux-loop/round-41/reading-flow/reading-flow-drive.json','utf8'));
const plan=logs.find(x=>x.request?.action==='plan'&&x.response?.kind==='ok'),reading=logs.find(x=>x.request?.action==='predict'&&x.response?.kind==='ok');
if(!plan||!reading)throw Error('Recorded plan and prediction are required');
const measurement=await readFile('scripts/measure-motion-browser.js','utf8'),checks=[];
try{for(let run=0;run<5;run++){
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  await page.addInitScript(()=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:3,onboardingDone:true,ageConfirmed:true,ageBand:'adult',reduceMotion:false})));
  await page.route('**/engine',route=>{const action=route.request().postDataJSON()?.action;return route.fulfill({contentType:'application/json',body:JSON.stringify(action==='plan'?plan.response:action==='predict'?reading.response:{kind:'error',message:'No omen in this performance replay.'})})});
  await page.goto(process.env.PREVIEW_URL||'http://localhost:8098');await page.evaluate(()=>document.fonts.ready);await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill(plan.request.question);await page.getByTestId('look-into-the-future').click();
  for(let index=0;index<plan.response.value.cards.length;index++){await page.getByTestId('option-0').click();if(index<plan.response.value.cards.length-1)await page.getByTestId('answer-next').click();}
  await page.evaluate('('+measurement+')()');await page.evaluate(()=>motionAudit.sample('opening','answer-next',2200,'share-this-glimpse'));
  await page.evaluate(()=>motionAudit.sample('share','share-this-glimpse'));
  const samples=await page.evaluate(()=>motionAudit.finish());checks.push({run:run+1,freshBrowser:true,recordedReading:true,samples});await writeFile(`${out}/samples.json`,JSON.stringify(checks,null,2));
  await page.screenshot({path:`${out}/share-${run+1}.png`});
 }finally{await browser.close()}
}
 for(const check of checks)for(const sample of check.samples){expect(sample.fps,`run${check.run} ${sample.label} callbacks`).toBeGreaterThanOrEqual(58);expect(sample.shaderFps).toBeGreaterThanOrEqual(58);expect(sample.p95).toBeLessThanOrEqual(20);expect(sample.max).toBeLessThanOrEqual(50);expect(sample.longTasks).toEqual([]);}
}finally{await writeFile(`${out}/samples.json`,JSON.stringify(checks,null,2))}console.log('Five fresh opening-to-Share sessions pass unchanged frame budgets.');
