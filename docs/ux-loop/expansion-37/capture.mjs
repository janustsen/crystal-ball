import {chromium,expect} from '@playwright/test';import {mkdir,copyFile,writeFile} from 'node:fs/promises';
const out='docs/ux-loop/expansion-37';await mkdir(`${out}/screens`,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{for(const large of [false,true])for(const scene of ['omen','composer','circles'])for(const height of scene==='composer'?[844,500]:[844]){
 const suffix=`${height}-${large?200:100}`;
 const baseline=await browser.newPage({viewport:{width:390,height},isMobile:true,hasTouch:true});baseline.setDefaultTimeout(15000);await baseline.addInitScript(largeText=>{localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,plus:false,onboardingDone:true,ageConfirmed:true,ageBand:'teen',largeText,reduceMotion:true}));localStorage.setItem('crystal-ball-personal-omen-v1',JSON.stringify({day:new Date().toLocaleDateString('en-CA'),text:null}))},large);await baseline.goto('http://localhost:8098');
 if(scene==='composer'){await baseline.getByTestId('tab-ask').click();await baseline.getByTestId('type-instead').click();await baseline.getByTestId('question-input').fill('Will I start learning pottery this winter?');}
 if(scene==='circles'){await baseline.getByTestId('tab-sky').click();await baseline.getByTestId('social-section-circles').click();await expect(baseline.getByTestId('create-my-circle')).toBeDisabled();}
 await baseline.evaluate(()=>document.fonts.ready);await baseline.waitForTimeout(300);await baseline.screenshot({path:`${out}/screens/${scene}-baseline-initial-${suffix}.png`});
 if(scene==='composer'){await baseline.getByTestId('look-into-the-future').scrollIntoViewIfNeeded();await baseline.screenshot({path:`${out}/screens/${scene}-baseline-decision-${suffix}.png`});}
 if(scene==='circles'){await baseline.getByRole('button',{name:'Try connecting again',exact:true}).scrollIntoViewIfNeeded();await baseline.screenshot({path:`${out}/screens/${scene}-baseline-decision-${suffix}.png`});}
 await baseline.close();
 for(const variant of ['a','b','c']){
 const page=await browser.newPage({viewport:{width:390,height},isMobile:true,hasTouch:true}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://localhost:8098/concepts/expansion-37.html?scene=${scene}&variant=${variant}&large=${large?1:0}&short=${height===500?1:0}&capture=1`);await page.locator('#tradeoff').filter({hasText:/./}).waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/screens/${scene}-${variant}-initial-${suffix}.png`});
 if(scene==='omen'){await page.locator('.content').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:`${out}/screens/${scene}-${variant}-detail-${suffix}.png`});}
 if(scene!=='omen'){await page.locator(scene==='composer'?'#ask':'#retry').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/screens/${scene}-${variant}-decision-${suffix}.png`});}
 if(variant==='b'){await page.locator('summary').click();await page.locator('details').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/screens/${scene}-${variant}-expanded-${suffix}.png`});}
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);checks.push({scene,variant,large,height,errors,horizontalOverflow:false,prototypeOnly:true});await page.close();
 }
}}finally{await browser.close();await writeFile(`${out}/checks.json`,JSON.stringify(checks,null,2))}console.log(checks.length,'prototype states');
