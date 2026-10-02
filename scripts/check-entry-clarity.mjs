import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/entry-clarity';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{for(const largeText of [false,true]){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(largeText=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},largeText,reduceMotion:true})),largeText);
 const page=await context.newPage();
 try{
  await page.goto(base);await page.getByTestId('onboarding-birthday').fill('1995-06-15');await page.getByTestId('continue').click();
  await expect(page.getByText('Choose one, or skip. You can change it later.',{exact:true})).toBeVisible();
  const focus=page.getByTestId('learning-growth');await focus.focus();await page.keyboard.press('Space');await expect(focus).toHaveAttribute('aria-pressed','true');await expect(focus).toContainText('✓');
  const work=page.getByTestId('work-purpose');await work.click();await expect(work).toHaveAttribute('aria-pressed','true');await expect(focus).toHaveAttribute('aria-pressed','false');await focus.click();await page.screenshot({path:`${out}/focus-selected-${largeText?200:100}.png`});
  await page.getByTestId('meet-the-ball').click();await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
  const myself=page.getByTestId('ask-about-myself'),someone=page.getByTestId('ask-about-someone');await expect(myself).toHaveAttribute('aria-pressed','true');await someone.click();await expect(someone).toHaveAttribute('aria-pressed','true');await expect(myself).toHaveAttribute('aria-pressed','false');
  await expect(page.getByText('First name',{exact:true})).toBeVisible();await page.getByTestId('person-name').fill('Alex');await page.getByTestId('question-input').fill('Will Alex learn Spanish this year?');await page.screenshot({path:`${out}/person-${largeText?200:100}.png`});await myself.click();await expect(page.getByTestId('person-name')).toHaveCount(0);await expect(page.getByTestId('question-input')).toHaveValue('Will Alex learn Spanish this year?');
  checks.push({largeText,focusInstructionCorrect:true,singleFocusSelection:true,keyboardSelection:true,modeExplicit:true,firstNameLabel:true,questionRetained:true});
 }catch(error){await page.screenshot({path:`${out}/failure-${largeText?200:100}.png`});throw error}finally{await context.close()}
}}finally{await browser.close();await writeFile(`${out}/entry.json`,JSON.stringify(checks,null,2));}
console.log(checks);
