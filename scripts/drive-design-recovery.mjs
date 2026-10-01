import {httpCredentials,previewFetch as fetch} from './preview-auth.mjs';
import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({httpCredentials,viewport:{width:390,height:844}}),page=await context.newPage(),log=[];
const base='http://localhost:8087';
const endpoint=`${base}/engine`;
const shot=async name=>page.screenshot({path:`docs/evidence/design-2026-09-30/${name}.png`});
try{
 expect((await fetch(`${endpoint}/health`).then(r=>r.json())).provider).toBe('ollama');await page.goto(base);await page.getByTestId('tab-ask').waitFor();
 await page.evaluate(()=>{window.__voice={starts:0,stops:0};window.SpeechRecognition=class {start(){window.__voice.starts++}stop(){window.__voice.stops++}}});
 await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').waitFor();expect(await page.evaluate(()=>window.__voice.starts)).toBe(1);await page.getByTestId('type-instead').click();expect(await page.evaluate(()=>window.__voice.stops)).toBe(1);log.push({voiceUnmountStopsRecording:true,boundary:'SpeechRecognition constructor mocked; real component lifecycle'});
 await page.getByTestId('question-input').fill('Will I be conversational in Spanish in six months?');
 let held;
 await page.route(endpoint,route=>{held=route});await page.getByTestId('look-into-the-future').click();await page.waitForTimeout(8500);await expect(page.getByText(/Still working/)).toBeVisible();await shot('long-wait');await page.getByRole('button',{name:'Cancel',exact:true}).click();await held.abort().catch(()=>{});await page.unroute(endpoint);await expect(page.getByTestId('tab-home')).toBeVisible();expect(await page.getByTestId('view-plans').innerText()).toBe('1 reading');log.push({cancelSpendsNoReading:true});
 await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill('Will I be conversational in Spanish in six months?');await page.route(endpoint,route=>{held=route});await page.getByTestId('look-into-the-future').click();await page.getByTestId('try-again').waitFor({timeout:65000});await expect(page.getByText(/The Ball took too long/)).toBeVisible();await shot('timeout');await held.abort().catch(()=>{});await page.unroute(endpoint);expect(await page.getByTestId('view-plans').innerText()).toBe('1 reading');log.push({real60SecondTimeout:true});
 await page.getByTestId('try-again').click();await page.getByTestId('option-0').waitFor({timeout:65000});
 await page.route(endpoint,route=>route.request().postDataJSON().action==='predict'?route.abort():route.continue());
 for(let i=0;i<3;i++){await page.getByTestId('option-0').click();await page.waitForTimeout(800)}await page.getByTestId('try-again').waitFor();await expect(page.getByText(/Your answers are kept/)).toBeVisible();expect(await page.getByTestId('view-plans').innerText()).toBe('1 reading');await page.getByRole('button',{name:'Review answers',exact:true}).click();await page.getByTestId('option-0').waitFor();await shot('review-retained-answers');await page.unroute(endpoint);log.push({failedPredictionRetainsAnswers:true,passed:true});
}catch(error){log.push({failure:String(error)});await shot('recovery-failure');console.error(error);process.exitCode=1}finally{await writeFile('docs/evidence/design-2026-09-30/recovery.json',JSON.stringify(log,null,2));await context.close();await browser.close()}
