import {httpCredentials} from './preview-auth.mjs';
import {chromium,expect} from '@playwright/test';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
// Plus birth chart depth and the narrated Ball against the live engine. Only the speech synthesizer is spied on.
const url=process.env.VERIFY_URL||'http://localhost:8087',engine=process.env.VERIFY_ENGINE_URL||`${url}/engine`,out=process.env.EVIDENCE_DIR||'docs/evidence/plus-chart-voice';
await mkdir('.local',{recursive:true});await mkdir(out,{recursive:true});
const context=await chromium.launchPersistentContext(await mkdtemp(`${process.cwd()}/.local/plus-chart-voice-`),{httpCredentials,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await context.addInitScript(()=>{window.__speech=[];const synth=window.speechSynthesis;synth.speak=line=>window.__speech.push({speak:line.text});synth.cancel=()=>window.__speech.push({cancel:true});});
const page=await context.newPage(),log=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',async response=>{if(response.request().method()==='POST'&&response.url().startsWith(engine))try{log.push({request:response.request().postDataJSON(),response:await response.json()})}catch{}});
const shot=async name=>{await page.waitForTimeout(800);await page.screenshot({path:`${out}/${name}.png`});};
const spoken=()=>page.evaluate(()=>window.__speech.filter(entry=>entry.speak).map(entry=>entry.speak));
async function read(question){
 await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill(question);await page.getByTestId('look-into-the-future').click();
 const deadline=Date.now()+180000;
 while(!await page.getByTestId('share-this-glimpse').count()){
  if(await page.getByText('The mist is too thick.',{exact:true}).count()||await page.getByText('This one isn’t for the Ball.',{exact:true}).count())throw new Error(`Reading failed: ${await page.locator('body').innerText()}`);
  if(Date.now()>=deadline)throw new Error('Reading did not reveal within 180 seconds.');
  if(await page.getByTestId('option-0').count())await page.getByTestId('option-0').click({timeout:Math.max(1,Math.min(10000,deadline-Date.now()))});
  await page.waitForTimeout(1000);
 }
 await page.getByTestId('why-disclosure').click();
}
async function home(){while(await page.getByTestId('close-flow').count())await page.getByTestId('close-flow').click();}
try{
 await page.goto(url);await page.getByTestId('birthday-month').click();await page.getByTestId('birthday-month').fill('06');await page.getByTestId('birthday-day').fill('15');await page.getByTestId('birthday-year').fill('1995');await page.getByTestId('continue').click();
 await page.getByTestId('tab-you').click();await page.getByTestId('add-birth-time-and-place').click();await page.getByLabel('Birth time HH:MM').fill('12:30');await page.getByLabel('Birth city',{exact:true}).fill('Copenhagen');await page.getByTestId('find-birth-city').click();await page.getByRole('button').filter({hasText:/Copenhagen.*Denmark/}).first().click({timeout:20000});await page.getByTestId('reveal-moon-and-rising').click();
 await expect(page.getByTestId('light-sun')).toContainText('Sun · Gemini');await expect(page.getByTestId('light-moon')).toContainText('Moon · Capricorn');await expect(page.getByTestId('light-rising')).toContainText('Rising · Virgo');await expect(page.getByText('With Plus, your Moon and rising shape every Why.')).toBeVisible();await expect(page.getByTestId('chart-weather-plus')).toBeVisible();await expect(page.getByTestId('chart-weather-read')).toHaveCount(0);await shot('free-chart');

 await read('Will I finish writing my novel this year?');
 await expect(page.getByText(/^Under your Gemini Sun, consider/)).toBeVisible();await expect(page.getByTestId('narration-toggle')).toHaveCount(0);expect(await spoken()).toEqual([]);await shot('free-reveal');
 const freeAsk=log.findLast(entry=>entry.request.action==='predict');expect(freeAsk.request.viewerChart).toBeUndefined();

 await home();await page.getByTestId('view-plans').click();await page.getByRole('radio',{name:/^Monthly\b/}).click();await page.getByTestId('continue-with-plus-simulate').click();await home();
 await read('Will I run a half marathon next spring?');
 const plusAsk=log.findLast(entry=>entry.request.action==='predict');expect(plusAsk.request.viewerChart).toEqual({moonSign:'capricorn',risingSign:'virgo'});
 await expect(page.getByText(/^Under your Gemini Sun, Capricorn Moon and Virgo rising/)).toBeVisible();
 const headline=plusAsk.response.value.headline;await expect.poll(spoken).toEqual([headline]);
 const narrated=await spoken();await expect(page.getByTestId('narration-toggle')).toHaveText('Mute the Ball');await shot('plus-reveal');
 const cancelCount=()=>page.evaluate(()=>window.__speech.filter(entry=>entry.cancel).length);
 // Recording a replay silences the Ball; returning to the reveal narrates it again.
 const beforeCapture=await cancelCount();await page.getByTestId('record-reveal').click();await page.getByTestId('capture-reveal').waitFor();
 expect(await cancelCount()).toBeGreaterThan(beforeCapture);expect(await spoken()).toHaveLength(1);
 await page.getByTestId('close-capture').click();await expect.poll(spoken).toHaveLength(2);
 // Share covers the reveal the same way.
 const beforeShare=await cancelCount();await page.getByTestId('share-this-glimpse').click();await expect.poll(cancelCount).toBeGreaterThan(beforeShare);expect(await spoken()).toHaveLength(2);
 await page.getByTestId('close-flow').click();await expect.poll(spoken).toHaveLength(3);
 const cancels=await cancelCount();
 await page.getByTestId('narration-toggle').click();await expect(page.getByTestId('narration-toggle')).toHaveText('Let the Ball speak');
 expect(await page.evaluate(()=>window.__speech.filter(entry=>entry.cancel).length)).toBeGreaterThan(cancels);expect(await spoken()).toHaveLength(3);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).narrationMuted)).toBe(true);

 await home();await page.getByTestId('tab-you').click();await expect(page.getByText('Your Moon and rising shape every Why.')).toBeVisible();await page.getByTestId('chart-weather-read').click();
 await page.getByTestId('chart-weather').waitFor({timeout:65000});const weather=await page.getByTestId('chart-weather').innerText();expect(weather).toMatch(/^Chart weather · \w+/);await shot('chart-weather');
 await page.reload();await page.getByTestId('tab-you').click();await expect.poll(()=>page.getByTestId('chart-weather').innerText()).toBe(weather);await expect(page.getByTestId('chart-weather-read')).toHaveCount(0);
 const chartCalls=log.filter(entry=>entry.request.action==='chart');expect(chartCalls).toHaveLength(1);expect(chartCalls[0].request.viewerChart).toEqual({moonSign:'capricorn',risingSign:'virgo'});
 expect(errors).toEqual([]);
 await writeFile(`${out}/drive.json`,JSON.stringify({freeWhy:'Sun only',plusAstrology:plusAsk.response.value.astrology,narrated,weather,chartRequests:chartCalls.length,engine:log.map(entry=>({action:entry.request.action,viewerChart:entry.request.viewerChart,kind:entry.response.kind}))},null,1));
 console.log('PASS: free sees Sun-only Why and no narration; Plus Why carries Moon and rising, narration speaks headline with label, pauses behind replay and Share, and mutes; one chart weather per month persists.');
}catch(error){await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});await writeFile(`${out}/failure.json`,JSON.stringify({error:String(error),errors,log},null,1));throw error;}
finally{await context.close();}
