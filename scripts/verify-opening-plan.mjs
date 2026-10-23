// Structural boundary checks: delayed/failed planning must never hold up the first card or the forecast request.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8087',out=process.env.EVIDENCE_DIR||'.local/opening-plan';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
try{
 for(const ready of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();let release,prediction;page.on('request',r=>{if(r.url()===`${base}/engine`&&r.postDataJSON()?.action==='predict')prediction=r.postDataJSON()});
  await page.goto(base);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();
  await page.route(`${base}/engine`,async route=>{
   const body=route.request().postDataJSON();
   if(body.action==='plan'){
    if(!ready)await new Promise(resolve=>{release=resolve});
    await route.fulfill({json:{kind:'ok',value:{topic:'general',provided:{horizon:'this month'},cards:[{id:'context_1',question:'How many days have you painted?',options:['One','Two','Three','Other'],remember:false}]}}}).catch(()=>{});
   }else{prediction=body;await route.abort()}
  });
  await page.getByTestId('tap-to-ask').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill('Will I finish my painting this month?');
  const started=Date.now();await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').waitFor();const firstCardMs=Date.now()-started;expect(firstCardMs).toBeLessThan(1000);
  if(ready)await page.waitForTimeout(500);
  await expect(page.getByText('How far along are you?',{exact:true})).toBeVisible();await page.screenshot({path:`${out}/${ready?'tailored':'pending'}-first.png`});
  await page.getByTestId('option-0').click();
  if(ready){
   await expect(page.getByText('How many days have you painted?',{exact:true})).toBeVisible();await page.screenshot({path:`${out}/tailored-next.png`});
   await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.getByText('How far along are you?',{exact:true})).toBeVisible();await page.getByTestId('option-2').click();await expect(page.getByText('How many days have you painted?',{exact:true})).toBeVisible();await page.getByTestId('option-0').click();
  }
  try{await expect.poll(()=>prediction,{timeout:10000}).toBeTruthy()}catch(error){await page.screenshot({path:`${out}/failure.png`});console.log(await page.locator('body').innerText());throw error};await expect(page.getByText(/Your answers are kept/)).toBeVisible();
  expect(prediction.facts.context_1).toContain(ready?'How many days have you painted? One':'How far along are you? Just starting');
  if(ready)expect(prediction.facts.session_open).toBe('How far along are you? Nearly finished');
  await page.screenshot({path:`${out}/${ready?'tailored':'pending'}-retained-answers.png`});
  results.push({ready,firstCardMs,facts:prediction.facts});release?.();await context.close();
 }
 console.log('PASS: immediate card, forecast proceeds while planning is held, tailored cards append without replacing the active card, Back preserves and edits the opening answer, errors retain all answers.');
}finally{await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));await browser.close()}
