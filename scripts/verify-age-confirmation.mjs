import {httpCredentials} from './preview-auth.mjs';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.VERIFY_URL||'http://localhost:8087';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const results=[],stamp=new Date().toISOString().replaceAll(':','-');
await mkdir('docs/evidence',{recursive:true});
try{
 for(const entry of ['fresh','friend','legacy'])for(const accept of [false,true]){
  const context=await browser.newContext({httpCredentials,viewport:{width:390,height:844}}),page=await context.newPage(),requests=[];
  try{
   if(entry==='legacy')await page.addInitScript(()=>{if(!localStorage.getItem('crystal-ball-v1'))localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{level:'Intermediate'},history:[],credits:3,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},onboardingDone:true,ageBand:'adult',sunSign:'aries',reduceMotion:true,largeText:false}));});
   await page.route('**/*',async route=>{
    const request=route.request();let body;try{body=request.postDataJSON()}catch{}
    if(request.method()!=='POST'||!['plan','predict'].includes(body?.action))return route.continue();
    requests.push(body);
    const value=body.action==='plan'?{topic:'general',provided:{horizon:'in 6 months'},cards:[{id:'context_1',question:'How often do you write?',options:['Daily','Weekly','Rarely','Other'],remember:false}]}:{id:'age-gate-fixture',question:body.question,headline:'You will finish in 6 months.',dueDate:'2027-04-01',createdAt:new Date().toISOString(),label:'Speculative forecast',why:'Fixture for age-gate storage verification.',facts:body.facts,sources:[],assumptions:[],friend:body.friend};
    await route.fulfill({contentType:'application/json',body:JSON.stringify({kind:'ok',value})});
   });
   await page.goto(entry==='friend'?`${base}/?friend=1&question=${encodeURIComponent('Will I finish writing in six months?')}`:base);
   await expect(page.getByTestId('onboarding-birthday')).toBeVisible();await expect(page.getByTestId('tab-ask')).toHaveCount(0);
   await page.getByTestId('skip-for-now').click();await expect(page.getByTestId('confirm-age')).toBeVisible();expect(requests).toHaveLength(0);
   await page.getByTestId(accept?'confirm-age':'decline-age').click();
   await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).onboardingBlocked)).toBe(!accept);
   await page.reload();
   if(!accept){await expect(page.getByTestId('skip-for-now')).toBeDisabled();await expect(page.getByTestId('tab-ask')).toHaveCount(0);expect(requests).toHaveLength(0);}
   else{
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')));
    expect(saved.ageConfirmed).toBe(true);expect(saved.ageBand).toBe('teen');expect(saved.sunSign).toBeNull();expect(saved.birthday).toBeUndefined();expect(saved.onboardingDone).toBe(true);
    if(entry==='friend'){
     await expect(page.getByTestId('question-input')).toHaveValue('Will I finish writing in six months?');await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').click();await page.getByTestId('share-this-glimpse').waitFor();
     await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).history.length)).toBe(1);
     expect(requests.map(r=>r.action)).toEqual(['plan','predict']);for(const r of requests){expect(r.ageConfirmed).toBe(true);expect(r.viewerBirthday).toBeUndefined();expect(r.friend).toBe(true);}
     expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).facts)).toEqual({});
    }else await expect(page.getByTestId('tab-ask')).toBeVisible();
   }
   results.push({entry,accept,passed:true,model:'explicit boundary fixture; not live model evidence'});
  }catch(error){await page.screenshot({path:`docs/evidence/age-confirmation-${stamp}-${entry}-${accept}-failure.png`});results.push({entry,accept,failure:String(error)});throw error;}finally{await context.close();}
 }
}finally{await writeFile(`docs/evidence/age-confirmation-${stamp}.json`,JSON.stringify(results,null,2));await browser.close();}
console.log('PASS: fresh, friend and legacy age confirmation, decline, reload and friend reading persistence.');
