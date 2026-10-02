// Replays a recorded real reading; the held export failure is deliberate fault injection.
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/share-feedback';await mkdir(out,{recursive:true});
const prediction=JSON.parse(await readFile('docs/ux-loop/round-12/real-drive/drive.json','utf8')).find(row=>row.action==='predict').response.value;
const browser=await chromium.launch({channel:'chrome',headless:true});const log=[];let release;const held=new Promise(resolve=>release=resolve);
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await page.addInitScript(prediction=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[prediction],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},largeText:false,reduceMotion:true})),prediction);
 let calls=0;await page.route('**/engine/share',async route=>{calls++;await held;await route.fulfill({status:500,body:'Injected export failure'})});
 await page.goto(base);await page.getByTestId('tab-history').click();await page.getByRole('button').filter({hasText:prediction.headline}).click();await page.getByTestId('share-this-glimpse').click();
 const more=page.getByTestId('share-more');if(await more.count())await more.click();
 await page.getByTestId('export-animated-story').scrollIntoViewIfNeeded();await page.getByTestId('export-animated-story').evaluate(el=>{el.click();el.click()});await expect.poll(()=>calls).toBeGreaterThan(0);await page.waitForTimeout(350);
 log.push({heldExportCalls:calls});await page.screenshot({path:`out/held.png`.replace('out/',`${out}/`)});expect(calls,'Double activation must start only one video export').toBe(1);
 await expect(page.getByTestId('export-animated-story')).toBeDisabled();await expect(page.getByTestId('export-animated-story')).toContainText('Preparing video');await expect(page.getByTestId('share-friend-link')).toBeEnabled();
 release();await expect(page.getByText(/Animation could not be exported/)).toBeVisible();await expect(page.getByTestId('export-animated-story')).toBeEnabled();await page.screenshot({path:`${out}/recovery.png`});log.push({passed:true,preparingVisible:true,otherToolsUsable:true,failedExportRetryEnabled:true});
}catch(error){log.push({failure:String(error)});process.exitCode=1}finally{release();await browser.close();await writeFile(`${out}/feedback.json`,JSON.stringify(log,null,2));console.log(log)}
