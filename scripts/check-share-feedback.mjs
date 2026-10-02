// Replays a recorded real reading; canvas encoding is held, then failed deliberately.
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/share-feedback';await mkdir(out,{recursive:true});
const prediction=JSON.parse(await readFile('docs/ux-loop/round-12/real-drive/drive.json','utf8')).find(row=>row.action==='predict').response.value;
const browser=await chromium.launch({channel:'chrome',headless:true}),log=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await page.addInitScript(prediction=>localStorage.setItem('crystal-ball-v1',JSON.stringify({onboardingDone:true,ageConfirmed:true,facts:{},history:[prediction],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},largeText:false,reduceMotion:true})),prediction);
 await page.goto(base);await page.getByTestId('tab-history').click();await page.getByRole('button').filter({hasText:prediction.headline}).click();await page.getByTestId('share-this-glimpse').click();await page.getByRole('img',{name:/^Crystal Ball\./}).waitFor();await expect(page.getByTestId('export-animated-story')).toHaveCount(0);await page.getByTestId('share-more').click();
 await page.evaluate(()=>{window.__exportCallbacks=[];window.__realToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback){window.__exportCallbacks.push(callback)}});
 await page.getByTestId('export-story-card').evaluate(el=>{el.click();el.click()});await expect.poll(()=>page.evaluate(()=>window.__exportCallbacks.length)).toBeGreaterThan(0);await page.waitForTimeout(350);
 const calls=await page.evaluate(()=>window.__exportCallbacks.length);log.push({heldImageEncodes:calls,videoAbsent:true});await page.screenshot({path:`${out}/held.png`});expect(calls,'Double activation must start only one image export').toBe(1);
 await expect(page.getByTestId('export-story-card')).toBeDisabled();await expect(page.getByTestId('export-story-card')).toContainText('Preparing image');await expect(page.getByTestId('share-friend-link')).toBeEnabled();
 await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__realToBlob;for(const callback of window.__exportCallbacks)callback(null)});await expect(page.getByText(/The card could not be exported/)).toBeVisible();await expect(page.getByTestId('export-story-card')).toBeEnabled();await page.screenshot({path:`${out}/recovery.png`});
 const download=page.waitForEvent('download');await page.getByTestId('export-story-card').click();await(await download).saveAs(`${out}/retry-image.png`);await expect(page.getByText('Image download started. Private answers are excluded.')).toBeVisible();log.push({passed:true,preparingVisible:true,otherToolsUsable:true,failedExportRetryEnabled:true,realImageRetryDownloaded:true});
}catch(error){log.push({failure:String(error)});process.exitCode=1}finally{await browser.close();await writeFile(`${out}/feedback.json`,JSON.stringify(log,null,2));console.log(log)}
