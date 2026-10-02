import {chromium,expect} from '@playwright/test';
import {httpCredentials} from './preview-auth.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.VERIFY_URL||'http://localhost:8087';
const evidence=process.env.DESIGN_EVIDENCE||`.local/profile-retention-${Date.now()}`;await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({httpCredentials,timezoneId:'America/Los_Angeles',viewport:{width:390,height:844}});
const page=await context.newPage(),requests=[],log=[];
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')));
try{
 await page.clock.setFixedTime(new Date('2026-10-01T00:30:00Z'));
 await page.route('**/engine',async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  if(body.action==='omen')return route.fulfill({json:{kind:'ok',value:{text:'Your daily reflection is ready.'}}});
  await route.continue();
 });
 await page.goto(base);await page.getByTestId('onboarding-birthday').fill('1995-06-15');await page.getByTestId('continue').click();await page.getByTestId('meet-the-ball').click();
 await expect.poll(()=>requests.filter(r=>r.action==='omen').length).toBe(1);expect(requests[0].facts.sun_sign).toBe('gemini');
 await page.getByTestId('tab-you').click();
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('crystal-ball-v1'));Object.assign(state,{birthTime:'14:30',birthPlace:'Copenhagen',moonSign:'aries',risingSign:'leo',history:[{id:'birthday-fixture',question:'Will I learn?',headline:'You will learn.',createdAt:'2026-09-01T12:00:00Z',label:'Speculative',why:'Practice continues.',facts:{birthday:'1995-06-15',level:'Beginner'},sources:[],assumptions:[],friend:false}]});localStorage.setItem('crystal-ball-v1',JSON.stringify(state));}); // test fixture, no user-controlled data; nosemgrep: javascript.lang.security.insecure-object-assign.insecure-object-assign
 await page.reload();await page.getByTestId('tab-you').click();await page.getByTestId('edit-birthday').click();await page.getByTestId('save-birthday').click();
 await expect(page.getByText('aries Moon · leo rising')).toBeVisible();expect((await stored()).birthTime).toBe('14:30');
 await page.getByTestId('edit-birthday').click();await page.getByTestId('remove-birthday-options').click();await page.getByTestId('forget-birthday').click();
 await expect(page.getByText('Your Sun sign is a mystery')).toBeVisible();
 await expect.poll(async()=> (await stored()).birthday).toBeUndefined();
 for(const reload of [false,true]){
  if(reload){await page.reload();await page.getByTestId('tab-you').click();}
  const state=await stored();expect(state.ageConfirmed).toBe(true);expect(state.ageBand).toBe('adult');expect(state.history[0].facts.birthday).toBeUndefined();expect(state.history[0].facts.level).toBe('Beginner');
  expect(state.birthTime).toBeUndefined();expect(state.sunSign).toBeNull();await expect(page.getByTestId('tab-ask')).toBeVisible();
 }
 await page.getByTestId('tab-home').click();expect(requests.filter(r=>r.action==='omen')).toHaveLength(1);
 await page.clock.setFixedTime(new Date('2026-10-02T00:30:00Z'));await page.reload();
 await expect.poll(()=>requests.filter(r=>r.action==='omen').length).toBe(2);expect(requests.filter(r=>r.action==='omen')[1].facts.sun_sign).toBeUndefined();
 await page.getByTestId('tab-you').click();await page.getByTestId('edit-birthday').click();await page.getByLabel('Birthday YYYY-MM-DD',{exact:true}).fill('1996-07-15');await page.getByTestId('save-birthday').click();await expect(page.getByText('cancer Sun',{exact:true})).toBeVisible();
 await page.getByTestId('edit-birthday').click();await page.getByLabel('Birthday YYYY-MM-DD',{exact:true}).fill('');await page.getByTestId('save-birthday').click();await expect(page.getByText('Your Sun sign is a mystery')).toBeVisible();expect((await stored()).ageConfirmed).toBe(true);
 await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill('Will I finish my draft tomorrow?');
 await page.route('**/engine',route=>{const body=route.request().postDataJSON();requests.push(body);return route.fulfill({json:{kind:'error',message:'Local date transport probe'}})});
 await page.getByTestId('look-into-the-future').click();await expect.poll(()=>requests.some(r=>r.action==='plan')).toBe(true);expect(requests.find(r=>r.action==='plan').localDate).toBe('2026-10-01');
 await page.screenshot({path:`${evidence}/profile.png`});
 log.push({passed:true,unchangedChart:true,forgottenBirthdayScrubbed:true,ageRetained:true,omenQuotaPreserved:true,localDate:'2026-10-01',boundary:'Seeded saved chart/Reading; omen and date-probe responses are fixtures. Real UI and persistence.'});
}catch(error){log.push({failure:String(error)});throw error;}finally{await writeFile(`${evidence}/drive.json`,JSON.stringify(log,null,2));await context.close();await browser.close();console.log(evidence);}
