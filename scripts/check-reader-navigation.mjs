import {skipPreviewOnboarding} from './skip-preview-onboarding.mjs';
// Replays a recorded real reading to check reader integrity and keyboard focus.
import {chromium,expect} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';import {readFile,mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/why-details';await mkdir(out,{recursive:true});const prediction=JSON.parse(await readFile('docs/ux-loop/round-12/real-drive/drive.json','utf8')).find(row=>row.action==='predict').response.value;const browser=await chromium.launch({channel:'chrome',headless:true});const log=[];
try{for(const largeText of [false,true]){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(({prediction,largeText})=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[prediction],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},largeText,reduceMotion:true})),{prediction,largeText});const page=await context.newPage();await page.goto(base);await skipPreviewOnboarding(page);await page.getByTestId('tab-history').click();await page.getByRole('button').filter({hasText:prediction.headline}).click();await page.getByTestId('why-disclosure').click();
 await expect(page.locator('.atmosphere')).toHaveClass(/utility/);
 await expect(page.getByTestId('why-disclosure')).toBeInViewport({ratio:1});
 await expect(page.getByTestId('share-this-glimpse')).toHaveCount(0);
 await expect(page.getByTestId('check-in-yes')).toHaveCount(0);
 await page.getByTestId('why-disclosure').click();await expect(page.getByTestId('why-disclosure')).toBeFocused();await expect(page.getByTestId('share-this-glimpse')).toBeVisible();
 log.push({largeText,freeBackVisible:true,readerHasNoForecastActions:true,returnFocus:true});await context.close();
}}catch(error){log.push({failure:String(error)});process.exitCode=1}finally{await browser.close();await writeFile(`${out}/why.json`,JSON.stringify(log,null,2));console.log(log)}
