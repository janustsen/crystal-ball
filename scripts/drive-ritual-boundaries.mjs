import {chromium,expect} from '@playwright/test';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {allOpen} from './ladder-seed.mjs';
const out=process.env.EVIDENCE_DIR||'.local/ritual-boundaries';await mkdir(out,{recursive:true});await mkdir('.local',{recursive:true});const profile=await mkdtemp(`${process.cwd()}/.local/ritual-boundary-`);
const browser=await chromium.launchPersistentContext(profile,{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:390,height:844}});
const page=await browser.newPage();page.setDefaultNavigationTimeout(180000);page.setDefaultTimeout(60000);
const day=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const today=day(),results=[];
const base=()=>({onboardingDone:true,ladder:allOpen,ageConfirmed:true,ageBand:'adult',sunSign:null,facts:{},history:[],credits:2,plus:false,usage:{day:today,count:0},reduceMotion:true,ritual:{days:{},stars:[],opened:[today],notify:{daily:false,time:'08:30',offered:day(-5),reoffered:true},counts:{}}});
const seed=async state=>{await page.evaluate(({state,today})=>{localStorage.clear();localStorage.setItem('crystal-ball-v1',JSON.stringify(state));localStorage.setItem('crystal-ball-personal-omen-v1',JSON.stringify({day:today,text:'A small step opens a new possibility.'}))},{state,today});await page.reload();await page.getByTestId('tap-to-ask').waitFor()};
const you=async()=>{await page.getByTestId('tab-you').click();await page.getByTestId('today-card').waitFor()};
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')));
try{
 await page.goto(process.env.VERIFY_URL||'http://localhost:8087/');
 for(const offset of [-1,0,1]){
  const state=base();state.history=[{id:`reading${offset}`,createdAt:`${day(-3)}T12:00:00`,dueDate:day(offset),question:'Will I finish my practice?',headline:'A little practice opens the door.',label:'A possibility',why:'Practice makes space.',facts:{},sources:[],assumptions:[],friend:false}];await seed(state);await you();
  await expect(page.getByTestId('today-card')).toContainText('1 of 3');
  if(offset===0){await expect(page.getByTestId('today-card')).toContainText('A check-in is ready');await page.getByTestId('today-ask').click()}
  else {await expect(page.getByTestId('today-card')).not.toContainText('A check-in is ready');await page.getByTestId('today-ask').click();await page.getByTestId('type-instead').click();await expect(page.getByTestId('question-input')).toBeVisible();await page.getByTestId('close-flow').click();await page.getByTestId('tab-history').click()}
  await page.getByRole('button').filter({hasText:'Will I finish my practice?'}).click();await page.getByTestId('check-in-yes').click();
  await expect.poll(async()=>((await saved()).ritual.days[today]?.ask??0)).toBe(offset===0?1:0);
  await page.getByTestId('check-in-no').click();await expect.poll(async()=>(await saved()).history[0].outcome).toBe('no');
  await page.getByTestId('close-flow').click();await you();await page.getByTestId('today-card').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/due-${offset}.png`});results.push({offset,state:await saved()});
 }
 const state=base();state.ritual.notify={daily:false,time:'08:30',offered:day(-2)};state.ritual.opened=[day(-2),day(-1)];await seed(state);await expect(page.getByTestId('notify-offer')).toBeVisible();await page.getByTestId('notify-not-now').click();await page.reload();await page.getByTestId('tap-to-ask').waitFor();await expect(page.getByTestId('notify-offer')).toHaveCount(0);await you();results.push({day3:await saved()});await page.screenshot({path:`${out}/day3-dismissed.png`});
 const seventh=base();seventh.ritual.stars=Array.from({length:6},(_,i)=>day(-2-i)).reverse();seventh.history=[{id:'seventh',createdAt:`${day(-3)}T12:00:00`,dueDate:today,question:'Will I finish my practice?',headline:'A little practice opens the door.',label:'A possibility',why:'Practice makes space.',facts:{},sources:[],assumptions:[],friend:false}];await seed(seventh);await you();await page.getByTestId('today-questions').click();for(let i=0;i<3;i++){const question=await page.getByTestId('ask-question').innerText();await page.getByTestId('ask-option-0').click();await expect(page.getByTestId('ask-question')).not.toHaveText(question)}await you();
 await page.getByTestId('today-ask').click();await page.getByRole('button').filter({hasText:'Will I finish my practice?'}).click();await page.getByTestId('check-in-yes').click();await page.getByTestId('close-flow').click();await page.getByTestId('tab-you').click();await expect(page.getByTestId('your-sky')).toContainText('7 stars');await expect(page.getByTestId('your-sky')).toContainText('Collected: Ursa Major');await expect(page.getByTestId('your-sky')).toContainText('Orion · 0 of 7');await page.getByTestId('your-sky').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/seven-stars.png`});await page.reload();expect((await saved()).ritual.stars.length).toBe(7);results.push({seventh:await saved()});
 // An unfinished omen step brings the omen, still being read here, into view.
 await page.route('**/*',route=>route.request().method()==='POST'&&/"action":"omen"/.test(route.request().postData()??'')?undefined:route.fallback());
 await seed(base());await page.evaluate(state=>{localStorage.removeItem('crystal-ball-personal-omen-v1');localStorage.setItem('crystal-ball-v1',JSON.stringify(state))},base());await page.reload();await page.getByTestId('tap-to-ask').waitFor();await you();
 await expect(page.getByTestId('today-omen')).not.toHaveAttribute('aria-label',/done/);await expect(page.getByTestId('daily-omen')).toHaveCount(0);
 await page.getByTestId('today-omen').click();await expect(page.getByTestId('daily-omen')).toBeInViewport();await page.screenshot({path:`${out}/omen-step-scroll.png`});
 console.log('PASS omen step opens a pending omen on Home');
 await page.unrouteAll({behavior:'ignoreErrors'});
 console.log('PASS due-today eligibility, overdue/future exclusion, answer editing, day-3 offer once, seven-star constellation persistence');
}catch(e){results.push({failure:String(e)});await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw e}finally{await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));await browser.close();await rm(profile,{recursive:true,force:true})}
