import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.UX_EVIDENCE||'.local/omen-storage',base=process.env.PREVIEW_URL||'http://localhost:8098';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,onboardingDone:true,ageConfirmed:true,ageBand:'teen',reduceMotion:true}));const get=Storage.prototype.getItem;window.failOmenStorage=true;Storage.prototype.getItem=function(key){if(key==='crystal-ball-personal-omen-v1'&&window.failOmenStorage)throw Error('Controlled omen storage failure');return get.call(this,key)}});
 const page=await context.newPage();let requests=0;await page.route('**/engine',route=>{requests++;return route.fulfill({contentType:'application/json',body:JSON.stringify({kind:'error',message:'Controlled generation failure'})})});
 await page.clock.install();await page.goto(base);await expect(page.getByText('Your omen couldn’t be opened or saved.',{exact:true})).toBeVisible();await expect(page.getByText('Today’s attempt is used.',{exact:true})).toHaveCount(0);expect(requests).toBe(0);await page.screenshot({path:`${out}/storage-error.png`});
 await page.evaluate(()=>{window.failOmenStorage=false});await page.clock.fastForward(60000);await page.getByTestId('omen-daily-limit').click();await expect(page.getByText(/The Ball tries once a day/)).toContainText('Today’s attempt is used.');expect(requests).toBe(1);await page.clock.fastForward(60000);expect(requests).toBe(1);await page.screenshot({path:`${out}/recovered-used-attempt.png`});await writeFile(`${out}/checks.json`,JSON.stringify({storageErrorDoesNotClaimUsedAttempt:true,noRequestBeforeDurableClaim:true,recoversOnRefresh:true,generationFailureUsesOnlyOneAttempt:true,requests},null,2));
}finally{await browser.close()}
