import {chromium,expect} from '@playwright/test';
import {httpCredentials} from './preview-auth.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {tapToAsk} from './ladder-seed.mjs';
const base=process.env.VERIFY_URL||'http://localhost:8087',evidence=`.local/calendar-ui-${Date.now()}`,log=[];
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 for(const [timezoneId,day] of [['America/Los_Angeles','2026-12-31'],['Pacific/Kiritimati','2027-01-01']]){
  const context=await browser.newContext({httpCredentials,timezoneId,viewport:{width:390,height:844}}),page=await context.newPage();
  try{
   await page.clock.setFixedTime(new Date(timezoneId==='America/Los_Angeles'?'2027-01-01T00:30:00Z':'2026-12-31T12:30:00Z'));
   let cardId='horizon';const submitted=[];
   await page.route('**/engine',route=>{
    const body=route.request().postDataJSON();
    if(body.action==='omen')return route.fulfill({json:{kind:'ok',value:{text:'Your daily reflection is ready.'}}});
    if(body.action==='plan')return route.fulfill({json:{kind:'ok',value:{topic:cardId==='growth_weeks'?'growth':cardId==='deadline'?'learning':'general',provided:{},cards:[{id:cardId,question:'How far ahead should the Ball look?',options:['Other'],remember:false}]}}});
    submitted.push(body);return route.fulfill({json:{kind:'error',message:'Calendar submission probe; no reading charged.'}});
   });
   await page.goto(base);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();
   for(const id of ['horizon','deadline','growth_weeks']){
    cardId=id;
    await tapToAsk(page);await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill('Will I finish my project?');await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').click();
    await page.getByTestId('other-input').fill(id==='growth_weeks'?'1.5':'in 1.5 weeks');await page.getByTestId('answer-next').click();await expect(page.getByText(/Use a positive timeframe with whole/)).toBeVisible();
    if(id!=='growth_weeks'&&timezoneId==='Pacific/Kiritimati'){
     await page.getByTestId('other-input').fill('by 2026');await page.getByTestId('answer-next').click();await expect(page.getByText('Use a current or future timeframe.')).toBeVisible();
    }
    expect(submitted).toHaveLength(log.filter(x=>x.timezoneId===timezoneId).length);
    const value=id==='growth_weeks'?'1':`by ${day.slice(0,4)}`;
    await page.getByTestId('other-input').fill(value);await page.getByTestId('answer-next').click();await page.getByTestId('try-again').waitFor();expect(submitted.at(-1).localDate).toBe(day);expect(submitted.at(-1).facts[id]).toBe(value);
    log.push({timezoneId,id,value,localDate:day,passed:true});await page.screenshot({path:`${evidence}/${timezoneId.replaceAll('/','-')}-${id}.png`});await page.getByTestId('close-flow').click();
   }
  }finally{await context.close();}
 }
}catch(error){log.push({failure:String(error)});throw error;}finally{await writeFile(`${evidence}/drive.json`,JSON.stringify({boundary:'Real UI validation and transport with fixture cards and failed forecast response; server date calculation tested separately.',log},null,2));await browser.close();console.log(evidence);}
