// Explicit network fault injection proves the app presents server limit messages; no paid inference occurs.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {httpCredentials} from './preview-auth.mjs';
import {tapToAsk,openEverything} from './ladder-seed.mjs';
const folder=process.env.EVIDENCE_DIR;
if(!folder)throw new Error('Set EVIDENCE_DIR to an owned scratch directory.');
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({httpCredentials,viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const results=[];
try{
 await page.goto(process.env.APP_URL||'http://localhost:8108');
 for(const [field,value] of [['month','06'],['day','15'],['year','1995']]){
  await page.getByTestId(`birthday-${field}`).click();await page.getByTestId(`birthday-${field}`).fill(value);
  await expect(page.getByTestId(`birthday-${field}`)).toHaveValue(value);
 }
 await page.getByTestId('continue').click();await page.getByTestId('about-done').click();await openEverything(page);
 await tapToAsk(page);await page.getByTestId('type-instead').click();
 await page.getByTestId('question-input').fill('Will I learn Spanish?');
 await expect(page.getByTestId('look-into-the-future')).toBeDisabled();
 await page.getByTestId('ai-details').click();
 await expect(page.getByText(/DeepInfra says it does not store or train on Qwen inputs or outputs/)).toBeVisible();
 await page.waitForTimeout(300);
 await page.screenshot({path:`${folder}/hosted-consent.png`});
 await page.getByTestId('dismiss-notice').click();
 await page.getByRole('switch',{name:'Allow AI processing'}).click();
 const messages=[
  'The Ball has reached its monthly reading budget. Please come back next month.',
  'You’ve reached today’s reading request limit. Please try again tomorrow.',
 ];
 let message=messages[0],requests=0;
 await page.route('**/engine',async route=>{
  const body=route.request().postDataJSON();
  if(body.action!=='plan')return route.continue();
  expect(body.aiConsent).toBe('DeepInfra');requests++;
  await route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({kind:'error',message})});
 });
 await page.getByTestId('look-into-the-future').click();
 await expect(page.getByText(messages[0],{exact:true})).toBeVisible();
 await page.waitForTimeout(300);
 await page.screenshot({path:`${folder}/hosted-monthly-limit.png`});
 message=messages[1];
 await page.getByRole('button',{name:'Try again',exact:true}).click();
 await expect(page.getByText(messages[1],{exact:true})).toBeVisible();
 await page.waitForTimeout(300);
 await page.screenshot({path:`${folder}/hosted-daily-limit.png`});
 expect(requests).toBe(2);
 results.push('DeepInfra permission is required and its data wording is readable','Monthly budget and daily quota messages survive the real client/reading flow','Two labeled 429 planning faults; zero paid inference');
 await writeFile(`${folder}/hosted-ui.json`,JSON.stringify({at:new Date().toISOString(),results},null,2));
 console.log(results);
}catch(error){
 await page.screenshot({path:`${folder}/hosted-drive-failed.png`});
 await writeFile(`${folder}/hosted-drive-failed.txt`,await page.locator('body').innerText());
 throw error;
}finally{await browser.close()}
