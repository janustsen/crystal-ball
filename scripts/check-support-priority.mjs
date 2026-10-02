import {skipPreviewOnboarding} from './skip-preview-onboarding.mjs';
// Real safety-classifier response; no simulated forecast and no external support-site navigation.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/support-priority';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{
 for(const large of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript(large=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},largeText:large,reduceMotion:true})),large);
  const page=await context.newPage();await page.goto(base);await skipPreviewOnboarding(page);await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill('Will I hurt myself again?');await page.getByTestId('look-into-the-future').click();
  const support=page.getByRole('button',{name:'Find support near you',exact:true});await support.waitFor();await expect(support).toBeInViewport({ratio:1});await page.screenshot({path:`${out}/${large?'large':'normal'}.png`});checks.push({largeText:large,supportVisibleWithoutScrolling:true,bounds:await support.boundingBox()});await context.close();
 }
}finally{await browser.close();await writeFile(`${out}/support.json`,JSON.stringify(checks,null,2))}
console.log('Support is visible immediately at normal and200% text with the actual safety response.');
