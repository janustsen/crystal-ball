import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.UX_EVIDENCE||'.local/omen-storage',base=process.env.PREVIEW_URL||'http://localhost:8098';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{for(const largeText of [false,true])for(const recovery of ['automatic','manual']){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(largeText=>{localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,onboardingDone:true,ageConfirmed:true,ageBand:'teen',largeText,reduceMotion:true}));const get=Storage.prototype.getItem;window.failOmenStorage=true;Storage.prototype.getItem=function(key){if(key==='crystal-ball-personal-omen-v1'&&window.failOmenStorage)throw Error('Controlled omen storage failure');return get.call(this,key)}},largeText);
 const page=await context.newPage();let requests=0;await page.route('**/engine',route=>{requests++;return route.fulfill({contentType:'application/json',body:JSON.stringify({kind:'error',message:'Controlled generation failure'})})});
 try{
  await page.clock.install();await page.goto(base);await expect(page.getByText('Your omen couldn’t be opened or saved.',{exact:true})).toBeVisible();await expect(page.getByTestId('omen-daily-limit')).toHaveCount(0);expect(requests).toBe(0);await page.screenshot({path:`${out}/storage-error-${recovery}-${largeText?200:100}.png`});
  if(recovery==='manual'){await page.getByTestId('retry-omen-storage').click();await expect(page.getByText('Your omen couldn’t be opened or saved.',{exact:true})).toBeVisible();expect(requests).toBe(0);}
  await page.evaluate(()=>{window.failOmenStorage=false});
  if(recovery==='manual'){await page.getByTestId('retry-omen-storage').focus();await page.keyboard.press('Enter');}else await page.clock.fastForward(60000);
  await page.getByTestId('omen-daily-limit').click();await expect(page.getByText('One free attempt daily, even if it fails. No readings spent.',{exact:true})).toBeVisible();await expect(page.getByText('Try tomorrow. Readings unchanged.',{exact:true})).toBeVisible();expect(requests).toBe(1);await page.clock.fastForward(60000);expect(requests).toBe(1);await page.screenshot({path:`${out}/recovered-${recovery}-${largeText?200:100}.png`});checks.push({largeText,recovery,storageErrorDoesNotClaimUsedAttempt:true,noRequestBeforeDurableClaim:true,generationFailureUsesOnlyOneAttempt:true,requests});
 }finally{await context.close()}
}}finally{await browser.close();await writeFile(`${out}/checks.json`,JSON.stringify(checks,null,2))}console.log(checks);
