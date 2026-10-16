// The question-count ladder on web. A brand-new account goes through onboarding and asks its first real question
// (local Ollama), which opens History; seeded accounts then show Home and You at 3, 5, 8, 12 and 20 questions and on
// day 2 after the free 20. Isolated Playwright; screenshots at 390×844 go to LADDER_EVIDENCE.
import {chromium,expect} from '@playwright/test';
import {httpCredentials} from './preview-auth.mjs';
import {mkdir} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8087',evidence=process.env.LADDER_EVIDENCE||'.local/ladder';
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const viewport={width:390,height:844},results=[];
const local=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const utc=offset=>new Date(Date.now()+offset*864e5).toISOString().slice(0,10);
const features=[['history',1],['about',3],['insight',5],['bond',8],['sky',12],['library',20]];
// An account that has asked `asked` questions (all today unless `yesterday`) and tapped every feature but the newest.
function account(asked,{yesterday=false,usedToday=0,openAll=false}={}){
 const opened=features.filter(([,at])=>at<asked||openAll&&at<=asked).map(([f])=>f);
 const history=Array.from({length:asked},(_,i)=>({id:`seed-${i}`,question:`Will question ${i+1} come true?`,headline:'Something good is on its way.',dueDate:local(30+i),createdAt:new Date(Date.now()-(yesterday?864e5:0)-i*6e4).toISOString(),label:'For fun · Speculative forecast',why:'A seeded reading for the ladder check.',facts:{},sources:[],assumptions:[],friend:false}));
 return {onboardingDone:true,ageConfirmed:true,ageBand:'adult',sunSign:null,facts:{},history,credits:0,plus:false,ladder:{asked,opened},usage:yesterday?{day:utc(0),count:usedToday}:{day:utc(0),count:asked},reduceMotion:true,largeText:false};
}
async function open(state){
 const context=await browser.newContext({httpCredentials,viewport,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 if(state)await context.addInitScript(([state,day])=>{
  localStorage.setItem('crystal-ball-v1',JSON.stringify(state));
  localStorage.setItem('crystal-ball-personal-omen-v1',JSON.stringify({day,text:'A small step today opens a door you have been watching.'}));
 },[state,local(0)]);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{timeout:120000});
 return {page,context,errors};
}
const shot=async(page,name)=>{await page.waitForTimeout(900);await page.screenshot({path:`${evidence}/${name}.png`});};
const pill=page=>page.getByTestId('view-plans').innerText();
const tabs=async page=>(await page.getByRole('tab').evaluateAll(t=>t.map(n=>n.getAttribute('aria-label'))));
try{
 // 0 → 1: onboarding, then the ball alone; the first real question opens History with a one-time notice and a dot.
 {
  const {page,context,errors}=await open(null);
  await page.getByTestId('onboarding-intro').waitFor({timeout:60000});
  await page.getByTestId('skip-for-now').click();
  await page.getByTestId('confirm-age').click();
  await page.getByTestId('about-done').click();
  await expect(page.getByTestId('tap-to-ask')).toBeVisible({timeout:30000});
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByTestId('insight-line')).toHaveCount(0);
  await expect(page.getByTestId('next-step')).toContainText('1 more question to open History');
  expect(await pill(page)).toContain('20 free questions');
  await shot(page,'q00-home');
  await page.getByTestId('tap-to-ask').click();await page.getByTestId('type-instead').click();
  await page.getByTestId('question-input').fill('Will I enjoy my new job this year?');await page.getByTestId('look-into-the-future').click();
  for(let i=0;i<2;i++){
   const next=await Promise.race([page.getByTestId('option-0').waitFor({timeout:90000}).then(()=>'card'),page.getByTestId('share-this-glimpse').waitFor({timeout:90000}).then(()=>'reveal')]);
   if(next==='reveal')break;await page.getByTestId('option-0').click();await page.waitForTimeout(800);
  }
  await page.getByTestId('share-this-glimpse').waitFor({timeout:90000});
  await expect(page.getByTestId('notice')).toContainText('New: History.');
  await shot(page,'q01-reveal-notice');
  while(await page.getByTestId('close-flow').count())await page.getByTestId('close-flow').click();
  expect(await tabs(page)).toEqual(['Home','History, new']);
  await expect(page.getByTestId('next-step')).toContainText('History');
  expect(await pill(page)).toContain('19 free questions');
  await shot(page,'q01-home');
  await page.getByTestId('tab-history').click();expect(await tabs(page)).toEqual(['Home','History']);
  results.push({state:'0→1 real reading',errors});await context.close();
 }
 const seeded=[
  [3,{},async page=>{
   expect(await tabs(page)).toEqual(['Home','History','You, new']);
   await expect(page.getByTestId('next-step')).toContainText('About you');
   await shot(page,'q03-home');
   await page.getByTestId('tab-you').click();await expect(page.getByTestId('open-ball-asks')).toHaveAttribute('aria-label',/About you, new/);
   await expect(page.getByTestId('open-bond')).toHaveCount(0);await expect(page.getByTestId('open-inner-library')).toHaveCount(0);
   await shot(page,'q03-you');
  }],
  [5,{},async page=>{
   await expect(page.getByTestId('insight-line')).toContainText('A small step today');
   await expect(page.getByTestId('insight-line')).toHaveAttribute('aria-label',/insight, new/);
   await expect(page.getByTestId('next-step')).toContainText('3 more questions to open Bond reading');
   await shot(page,'q05-home');
   await page.getByTestId('insight-line').click();
   await expect(page.getByTestId('daily-omen')).toBeVisible();await expect(page.getByTestId('next-step')).toHaveCount(0);
   await shot(page,'q05-insight-open');
   await page.getByTestId('insight-less').click();await expect(page.getByTestId('insight-line')).toBeVisible();
   await expect(page.getByTestId('insight-line')).not.toHaveAttribute('aria-label',/new/);
  }],
  [8,{},async page=>{
   await expect(page.getByTestId('next-step')).toContainText('Bond reading');
   await shot(page,'q08-home');
   await page.getByTestId('tab-you').click();await expect(page.getByTestId('open-bond')).toHaveAttribute('aria-label',/Bond reading, new/);
   await shot(page,'q08-you');
   await page.getByTestId('open-bond').click();await expect(page.getByTestId('leave-bond')).toBeVisible();
  }],
  [12,{},async page=>{
   await expect(page.getByTestId('open-sky')).toHaveAttribute('aria-label',/Tonight’s Sky, new/);
   await expect(page.getByTestId('next-step')).toContainText('8 more questions to open Inner Library');
   await shot(page,'q12-home');
   await page.getByTestId('open-sky').click();await expect(page.getByTestId('header-back')).toBeVisible();
   await shot(page,'q12-sky');
   await page.getByTestId('header-back').click();await expect(page.getByTestId('tap-to-ask')).toBeVisible();
   await expect(page.getByTestId('open-sky')).not.toHaveAttribute('aria-label',/new/);
  }],
  [20,{},async page=>{
   await expect(page.getByTestId('next-step')).toContainText('Inner Library');
   expect(await pill(page)).toContain('0 free today');
   await shot(page,'q20-home');
   await page.getByTestId('tab-you').click();await expect(page.getByTestId('open-inner-library')).toHaveAttribute('aria-label',/Inner Library, new/);
   await expect(page.getByText('Your first 20 questions are free',{exact:false})).toHaveCount(0);
   await shot(page,'q20-you');
   await page.getByTestId('view-plans').click();await expect(page.getByText('Free includes 1 question a day',{exact:false})).toBeVisible();
   await shot(page,'q20-plans');
  }],
  [20,{yesterday:true,openAll:true},async page=>{
   expect(await pill(page)).toContain('1 free today');
   await expect(page.getByTestId('next-step')).toHaveCount(0);
   await shot(page,'day2-home');
  }],
  [20,{yesterday:true,openAll:true,usedToday:1},async page=>{
   expect(await pill(page)).toContain('0 free today');
   await expect(page.getByTestId('next-step')).toContainText('Next free question: tomorrow');
   await shot(page,'day2-used-home');
   await page.getByTestId('next-step-action').click();await expect(page.getByText('Choose your next chapter.')).toBeVisible();
  }],
 ];
 for(const [asked,options,check] of seeded){
  const {page,context,errors}=await open(account(asked,options));
  await page.getByTestId('tap-to-ask').waitFor({timeout:60000});
  await check(page);
  results.push({state:`${asked}${options.yesterday?` day 2${options.usedToday?' used':''}`:''}`,errors});await context.close();
 }
 const failed=results.filter(r=>r.errors.length);
 if(failed.length)throw new Error(`Page errors: ${JSON.stringify(failed)}`);
 console.log(`PASS: ladder ${results.map(r=>r.state).join(', ')}; evidence in ${evidence}`);
}finally{await browser.close()}
