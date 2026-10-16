import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {tapToAsk,openEverything} from './ladder-seed.mjs';
const evidence=process.env.EVIDENCE_DIR;
if(!evidence)throw new Error('Set EVIDENCE_DIR to the evidence output directory.');
const port=process.env.VERIFY_PORT||'18198';
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--host-resolver-rules=MAP cb-uuid.test [::1]','--no-proxy-server']});
const results=[];
try{
 for(const scenario of [{name:'http-solo',secure:false,friend:false},{name:'http-friend-retry',secure:false,friend:true,retry:true},{name:'localhost-solo',secure:true,friend:false}]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[],requests=[],responses=[];
  const result={...scenario,requests,responses,errors};results.push(result);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/engine')requests.push(r.postDataJSON());});
  page.on('response',async r=>{if(r.request().method()==='POST'&&new URL(r.url()).pathname==='/engine')try{responses.push({status:r.status(),body:await r.json()});}catch{}});
  const url=`http://${scenario.secure?'localhost':'cb-uuid.test'}:${port}`;
  try{
   await page.goto(url);
   result.crypto=await page.evaluate(()=>({secure:isSecureContext,randomUUID:typeof crypto.randomUUID,getRandomValues:typeof crypto.getRandomValues,oldCall:(()=>{try{return crypto.randomUUID()}catch(e){return String(e)}})()}));
   assert.equal(result.crypto.secure,scenario.secure);
   assert.equal(result.crypto.randomUUID,scenario.secure?'function':'undefined');
   await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();await openEverything(page);
   const question='Will I finish writing my novel this year?';
   if(scenario.friend)await page.goto(`${url}/?friend=1&question=${encodeURIComponent(question)}`);
   else {await tapToAsk(page);await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill(question);}
   await expect(page.getByTestId('view-plans')).toHaveText('1 free today');
   let injected=false;
   if(scenario.retry)await page.route(`${url}/engine`,async route=>{
    if(route.request().postDataJSON().action==='predict'&&!injected){injected=true;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({kind:'error',message:'Verification-only temporary outage'})});}else await route.continue();
   });
   await page.getByTestId('look-into-the-future').click();
   await page.getByTestId('option-0').waitFor({timeout:65000});
   for(let index=1;index<=2;index++){
    const last=(await page.locator('body').innerText()).includes(`${index} of ${index}`);
    if(last)await page.getByTestId('option-0').evaluate(button=>{button.click();button.click();});
    else await page.getByTestId('option-0').click();
    if(last)break;
    await page.waitForTimeout(900);
   }
   if(scenario.retry){
    await page.getByTestId('try-again').waitFor({timeout:65000});
    await expect(page.getByTestId('view-plans')).toHaveText('1 free today');
    await page.screenshot({path:`${evidence}/${scenario.name}-outage.png`});
    await page.getByTestId('try-again').click();
   }
   await page.getByTestId('share-this-glimpse').waitFor({timeout:65000});
   await expect(page.getByTestId('view-plans')).toHaveText('0 free today');
   await page.waitForTimeout(1800);await page.screenshot({path:`${evidence}/${scenario.name}.png`});
   result.rendered=await page.locator('body').innerText();
   const relevant=requests.filter(r=>['plan','predict'].includes(r.action));
   assert.equal(new Set(relevant.map(r=>r.requestId)).size,1);
   assert.match(relevant[0].requestId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
   assert.equal(relevant.filter(r=>r.action==='predict').length,scenario.retry?2:1);
   assert.equal(relevant.every(r=>r.friend===scenario.friend),true);
   await page.reload();if(scenario.friend)await page.getByTestId('close-flow').click();await page.getByTestId('tab-history').click();
   await expect(page.getByRole('button').filter({hasText:question})).toHaveCount(1);
   await expect(page.getByTestId('view-plans')).toHaveText('0 free today');
   result.persisted=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('crystal-ball-v1'));return {history:s.history,usage:s.usage,credits:s.credits};});
   assert.equal(result.persisted.history.length,1);assert.equal(result.persisted.usage.count,1);assert.deepEqual(errors,[]);
   result.pass=true;console.log(`${scenario.name}: forecast revealed, one persisted reading, one charge, stable UUID; secure=${result.crypto.secure}`);
  }catch(error){result.failure=String(error);await page.screenshot({path:`${evidence}/${scenario.name}-failure.png`});throw error;}
  finally{await writeFile(`${evidence}/uuid-generation.json`,JSON.stringify(results,null,2));await context.close();}
 }
 assert.equal(new Set(results.map(r=>r.requests.find(q=>q.action==='plan').requestId)).size,results.length);
}finally{await browser.close();}
