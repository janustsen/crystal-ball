// The disclosure must match the actual plan request; inspecting it never submits.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.UX_EVIDENCE||'.local/sent-context';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{for(const largeText of [false,true])for(const person of [false,true]){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const facts={goal:'Practice pottery twice a week',location:'Copenhagen'},birthday='1995-06-15';
 await context.addInitScript(({largeText,facts,birthday})=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts,birthday,history:[],credits:3,onboardingDone:true,ageConfirmed:true,ageBand:'adult',largeText,reduceMotion:true})),{largeText,facts,birthday});
 const page=await context.newPage(),sent=[];
 await page.route('**/engine',route=>{const body=route.request().postDataJSON();if(body.action==='plan')sent.push(body);return route.fulfill({contentType:'application/json',body:JSON.stringify({kind:'error',message:'Controlled context check; no model request.'})})});
 try{
  await page.goto(process.env.PREVIEW_URL||'http://localhost:8098');await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
  if(person){await page.getByTestId('question-subject').click();await page.getByTestId('ask-about-someone').click();await page.getByTestId('person-name').fill('Alex');await page.getByTestId('save-subject').click();}
  await page.getByTestId('question-input').fill('Will this pottery habit continue?');
  const disclosure=page.getByTestId('sent-context-toggle');await disclosure.click();await expect(disclosure).toHaveAttribute('aria-expanded','true');
  const body=page.getByTestId('sent-context');await expect(body).toContainText('Jun 15, 1995');
  if(person){await expect(body).toContainText('Alex');await expect(body).not.toContainText(facts.goal);await expect(body).not.toContainText(facts.location);}else for(const value of Object.values(facts))await expect(body).toContainText(value);
  expect(sent).toEqual([]);await page.screenshot({path:`${out}/${person?'person':'self'}-${largeText?200:100}.png`});await disclosure.click();await expect(body).toHaveCount(0);expect(sent).toEqual([]);
  await page.getByTestId('look-into-the-future').click();await expect(page.getByTestId('try-again')).toBeVisible();expect(sent).toHaveLength(1);expect(sent[0].facts).toEqual(person?{}:{...facts,birthday});expect(sent[0]).toMatchObject({viewerBirthday:birthday,ageConfirmed:true,...person?{personName:'Alex'}:{}});
  checks.push({largeText,person,exactSentFacts:true,ageContextDisclosed:true,noSubmissionByDisclosure:true,oneRequestAfterAsk:true});
 }catch(error){await page.screenshot({path:`${out}/failure-${person?'person':'self'}-${largeText?200:100}.png`});throw error}finally{await context.close()}
}}finally{await browser.close();await writeFile(`${out}/checks.json`,JSON.stringify(checks,null,2))}console.log(checks);
