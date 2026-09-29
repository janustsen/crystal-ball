import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:false});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://localhost:8087');await page.bringToFront();await page.getByTestId('tab-ask').click();await page.getByTestId('question-input').fill('Will I learn Spanish in six months?');
 await page.evaluate(()=>{window.framePhase='planning';window.frameSamples=[];let last;function frame(now){if(last!==undefined)window.frameSamples.push({phase:window.framePhase,ms:now-last});last=now;window.frameLoop=requestAnimationFrame(frame)}requestAnimationFrame(frame)});
 await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').waitFor({timeout:65000});await page.evaluate(()=>window.framePhase='cards');
 for(let i=0;i<3;i++){await page.getByTestId('option-0').click();if(i===2)await page.evaluate(()=>window.framePhase='research');await page.getByTestId('answer-next').click()}
 await page.getByTestId('share-this-glimpse').waitFor({timeout:65000});await page.evaluate(()=>window.framePhase='reveal');await page.waitForTimeout(10000);
 const samples=await page.evaluate(()=>{cancelAnimationFrame(window.frameLoop);return window.frameSamples});const phases={};for(const phase of ['planning','cards','research','reveal']){const x=samples.filter(s=>s.phase===phase).map(s=>s.ms).sort((a,b)=>a-b);phases[phase]={n:x.length,meanMs:x.reduce((a,b)=>a+b,0)/x.length,p95Ms:x[Math.ceil(x.length*.95)-1],maxMs:x.at(-1)}}
 await writeFile('docs/evidence/performance-flow.json',JSON.stringify({at:new Date().toISOString(),scope:'Headed Chrome, real local inference; phase labels set by observed controls; reveal includes ten seconds after its first visible control. Browser cadence, not native FPS.',phases},null,2));console.log(phases);
}finally{await browser.close()}
