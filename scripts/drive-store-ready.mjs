// Local preview proof for launch changes. Purchases here are explicitly simulated; the one reading uses real Ollama.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {httpCredentials,previewFetch} from './preview-auth.mjs';
const base=process.env.PREVIEW_URL||'http://localhost:8087',out=process.env.EVIDENCE_DIR;
if(!out)throw new Error('Set EVIDENCE_DIR to a task-owned evidence directory.');
await mkdir(out,{recursive:true});
const health=await previewFetch(`${base}/engine/health`).then(r=>r.json());
expect(health).toMatchObject({app:'crystal-ball',provider:'ollama'});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results={health,boundary:'Real local Ollama reading; web mock purchases. No native StoreKit claim.'},errors=[];
let activePage;
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')||'{}'));
async function open(){
 const context=await browser.newContext({httpCredentials,viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const page=await context.newPage(),reported=[];page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url()===`${base}/engine`&&r.method()==='POST'&&r.postDataJSON()?.action==='heard')reported.push(r.postDataJSON())});
 await page.goto(base,{timeout:180000});
 return {page,context,reported};
}
async function finish(page){await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();await page.getByTestId('tap-to-ask').waitFor()}
try{
 const {page,context,reported}=await open();activePage=page;
 const question=page.getByRole('radiogroup',{name:'Where did you hear about us? (Optional)'});
 await expect(question.getByRole('radio')).toHaveCount(4);
 for(const name of ['TikTok','Instagram','A friend','Other']){
  const option=question.getByRole('radio',{name,exact:true});await option.click();await expect(option).toHaveAttribute('aria-checked','true');await option.click();await expect(option).toHaveAttribute('aria-checked','false');
 }
 await question.getByRole('radio',{name:'TikTok',exact:true}).click();
 await page.waitForTimeout(500);await page.screenshot({path:`${out}/01-onboarding.png`});
 expect(reported).toEqual([]);await finish(page);
 await expect.poll(async()=>(await stored(page)).heardFrom).toBe('TikTok');
 expect(reported).toEqual([{action:'heard',source:'TikTok'}]);
 await page.reload();await page.getByTestId('tap-to-ask').waitFor();expect((await stored(page)).heardFrom).toBe('TikTok');
 // First reading from an unseeded new account: the offer must not wait for question 20.
 await page.getByTestId('tap-to-ask').click();await page.getByTestId('type-instead').click();
 await page.getByTestId('question-input').fill('Will I enjoy my new job this year?');await page.getByTestId('look-into-the-future').click();
 for(let i=0;i<3;i++){
  await page.getByTestId('option-0').or(page.getByTestId('share-this-glimpse')).first().waitFor({timeout:120000});
  if(await page.getByTestId('share-this-glimpse').count())break;
  await page.getByTestId('option-0').click();await page.waitForTimeout(800);
 }
 await page.getByTestId('share-this-glimpse').waitFor({timeout:120000});
 if(await page.getByTestId('notify-not-now').count())await page.getByTestId('notify-not-now').click();
 await expect(page.getByTestId('plus-offer')).toBeVisible();
 expect((await stored(page)).history).toHaveLength(1);
 await expect.poll(async()=>(await stored(page)).plusOffered).toBe(true);
 await page.getByTestId('plus-offer').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/02-first-reveal-plus.png`});
 await page.getByTestId('plus-offer-open').click();console.log('Plans opened');
 await expect(page.getByText('Test mode · no real payments',{exact:true})).toBeVisible();
 await expect(page.getByRole('radio')).toHaveCount(2);await expect(page.getByText('$39.99',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'5 questions · $1.99 · simulate',exact:true}).click();
 await expect.poll(async()=>(await stored(page)).credits).toBe(5);console.log('Pack saved');
 await page.getByRole('button',{name:'Continue with Plus · simulate',exact:true}).click();
 await expect.poll(async()=>(await stored(page)).plus).toBe(true);console.log('Plus saved');
 await page.getByRole('button',{name:'Turn off simulated Plus',exact:true}).click();
 await expect.poll(async()=>(await stored(page)).plus).toBe(false);expect((await stored(page)).credits).toBe(5);
 await page.getByText('Restore purchases',{exact:true}).click();
 await expect(page.getByTestId('notice')).toContainText('Test mode has no App Store purchases to restore.');
 await page.getByTestId('close-flow').click();await expect(page.getByTestId('plus-offer')).toHaveCount(0);
 while(await page.getByTestId('close-flow').count())await page.getByTestId('close-flow').click();
 await page.getByTestId('tab-history').click();await page.getByText('“Will I enjoy my new job this year?”',{exact:true}).click();await expect(page.getByTestId('plus-offer')).toHaveCount(0);
 results.selected={heardFrom:(await stored(page)).heardFrom,history:1,plusOffered:true,credits:5};await context.close();
 const skip=await open();await finish(skip.page);expect((await stored(skip.page)).heardFrom).toBeUndefined();expect(skip.reported).toEqual([]);results.skip='no source saved or sent';await skip.context.close();
 expect(errors).toEqual([]);results.errors=errors;await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}catch(error){if(activePage&&!activePage.isClosed()){await activePage.screenshot({path:`${out}/failure.png`});await writeFile(`${out}/failure.txt`,await activePage.locator('body').innerText())}throw error}finally{await browser.close()}
