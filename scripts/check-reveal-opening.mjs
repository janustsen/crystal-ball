import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.UX_EVIDENCE||'.local/reveal-opening';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{for(const mode of ['normal','golden','reduced','system-reduced','skip','interrupt']){
 const golden=mode==='golden',reduced=mode==='reduced'||mode==='system-reduced',errors=[];
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:mode==='system-reduced'?'reduce':'no-preference',recordVideo:{dir:`${out}/raw`,size:{width:390,height:844}}});
 await context.addInitScript(reduceMotion=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:3,plus:false,onboardingDone:true,ageConfirmed:true,ageBand:'adult',reduceMotion})),mode==='reduced');
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const prediction={id:`opening-${mode}`,question:'Will I learn pottery this winter?',headline:'You’ll find your rhythm at the pottery wheel this winter.',label:'Speculative forecast · not a guarantee',why:'A weekly class can make room for practice.',facts:{},assumptions:['You keep practising.'],sources:[],createdAt:new Date().toISOString(),golden};
 await page.route('**/engine',r=>{const action=r.request().postDataJSON().action;return r.fulfill({contentType:'application/json',body:JSON.stringify({kind:'ok',value:action==='omen'?{text:'A small beginning can change the shape of a season.'}:action==='plan'?{topic:'general',provided:{},cards:[{id:'a',question:'Have you picked a class?',options:['Yes','Other'],remember:false}]}:prediction})})});
 try{
 await page.goto(process.env.PREVIEW_URL||'http://localhost:8098');await page.getByTestId('hero-orb').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill(prediction.question);await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').click();
 if(reduced){await page.getByTestId('reveal-content').waitFor();await expect(page.getByTestId('reveal-opening')).toHaveCount(0);expect(await page.getByTestId('reveal-content').evaluate(el=>getComputedStyle(el).transform)).toBe('none');}
 else{await page.getByTestId('reveal-opening').waitFor();expect(await page.locator('.opening-ember').count()).toBe(golden?12:8);
 if(mode==='skip'){await page.getByTestId('skip-reveal').focus();await page.keyboard.press('Enter');await expect(page.getByTestId('share-this-glimpse')).toBeVisible();await page.waitForTimeout(2200);await expect(page.getByTestId('reveal-opening')).toHaveCount(0);expect(await page.getByTestId('reveal-content').getAttribute('class')).toBe('opening-content');}
 else if(mode==='interrupt'){await page.getByTestId('close-flow').click();await page.waitForTimeout(2200);await expect(page.getByTestId('hero-orb')).toBeVisible();await page.getByTestId('tab-history').click();await page.getByRole('button').filter({hasText:prediction.headline}).click();await expect(page.getByTestId('reveal-opening')).toHaveCount(0);await expect(page.getByTestId('check-in-forecast')).toBeVisible();}
 else{const start=Date.now();for(const time of [0,180,500,900,1100,1500,2100]){await page.waitForTimeout(Math.max(0,time-(Date.now()-start)));await page.screenshot({path:`${out}/${mode}-${time}.png`});}await expect(page.getByTestId('share-this-glimpse')).toBeVisible();}
 }
 await expect(page.getByTestId('share-this-glimpse')).toBeVisible();await page.getByTestId('share-this-glimpse').click();await page.getByTestId('close-flow').click();await expect(page.getByTestId('reveal-opening')).toHaveCount(0);await expect(page.getByTestId('share-this-glimpse')).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).history);expect(saved.filter(p=>p.id===prediction.id)).toHaveLength(1);expect(saved.find(p=>p.id===prediction.id).headline).toBe(prediction.headline);expect(errors).toEqual([]);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);await page.screenshot({path:`${out}/${mode}-settled.png`});checks.push({mode,golden,reduced,savedOnce:true,shareReturnDoesNotReplay:true,errors,axeViolations:0});
 }finally{await context.close();await page.video().saveAs(`${out}/${mode}.webm`)}
}}finally{await browser.close();await writeFile(`${out}/checks.json`,JSON.stringify(checks,null,2))}console.log(checks);
