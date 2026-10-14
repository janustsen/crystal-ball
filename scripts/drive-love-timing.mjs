import {httpCredentials} from './preview-auth.mjs';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
// Love timing end to end against the real engine: an adult asks "When will it happen?", the plan never asks for a
// horizon, the Ball names the date, the reveal and the History shelf show it, and a teen profile is never offered it.
const evidenceDir=process.env.EVIDENCE_DIR||'docs/evidence';
await mkdir(evidenceDir,{recursive:true});
const url=process.env.VERIFY_URL||'http://localhost:8087',engine=new URL(process.env.VERIFY_ENGINE_URL||`${url}/engine`).href;
const horizons={'in 2 weeks':[0,14],'in 1 month':[1,0],'in 3 months':[3,0],'in 6 months':[6,0],'in 1 year':[12,0]};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const options={httpCredentials,viewport:{width:390,height:844},isMobile:true,hasTouch:true};
const log=[];
const shot=async(page,name)=>{await page.waitForTimeout(800);await page.screenshot({path:`${evidenceDir}/love-timing-${name}.png`})};
let page;
async function profile(year){
 const context=await browser.newContext(options);page=await context.newPage();
 page.on('response',async r=>{if(r.url().startsWith(engine)&&r.request().method()==='POST')try{log.push({request:r.request().postDataJSON(),response:await r.json()})}catch{}});
 await page.goto(url);
 await page.getByTestId('birthday-month').click();await page.getByTestId('birthday-month').fill('03');await page.getByTestId('birthday-day').fill('14');await page.getByTestId('birthday-year').fill(String(year));await page.getByTestId('continue').click();await page.getByTestId('about-done').click();
 await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
 return context;
}
try{
 const teen=await profile(new Date().getFullYear()-15);
 await expect(page.getByTestId('ask-about-someone')).toBeVisible();
 await expect(page.getByTestId('love-timing')).toHaveCount(0);
 await teen.close();

 await profile(1992);
 await page.getByTestId('love-timing').click();
 await expect(page.getByTestId('question-input')).toHaveValue('When will I meet someone special?');
 await expect(page.getByTestId('love-timing-label')).toBeVisible();
 await shot(page,'ask');
 await page.getByTestId('look-into-the-future').click();
 const answered=[];
 for(let i=0;i<3;i++){
  const option=page.getByTestId('option-0');
  await option.or(page.getByTestId('forecast-due-date')).first().waitFor({timeout:150000});
  if(!await option.isVisible())break;
  answered.push(await page.locator('[role=radiogroup]').evaluate(group=>group.parentElement.innerText));
  await option.click();await page.waitForTimeout(900);
 }
 await page.getByTestId('forecast-due-date').waitFor({timeout:150000});
 await expect(page.getByText('Love timing',{exact:true})).toBeVisible();
 await expect(page.getByTestId('forecast-due-date')).toContainText('When it happens');
 await shot(page,'reveal');
 const plan=log.find(e=>e.request.action==='plan'),predict=log.find(e=>e.request.action==='predict');
 if(plan?.request.timing!=='love'||predict?.request.timing!=='love')throw new Error('The engine requests did not carry timing love.');
 if(plan.response.kind!=='ok'||plan.response.value.cards.some(c=>c.id==='horizon'))throw new Error('The love timing plan asked for a horizon.');
 if(predict.response.kind!=='ok')throw new Error(`The forecast failed: ${JSON.stringify(predict.response)}`);
 const reading=predict.response.value,shift=horizons[reading.facts.horizon];
 if(!shift||reading.timing!=='love'||reading.label!=='Love timing')throw new Error(`Unexpected love timing reading: ${JSON.stringify(reading)}`);
 const due=new Date(`${predict.request.localDate}T00:00:00Z`);due.setUTCMonth(due.getUTCMonth()+shift[0]);due.setUTCDate(due.getUTCDate()+shift[1]);
 if(reading.dueDate!==due.toISOString().slice(0,10))throw new Error(`Due date ${reading.dueDate} does not follow ${reading.facts.horizon} from ${predict.request.localDate}.`);
 const shown=new Date(`${reading.dueDate}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
 await expect(page.getByTestId('forecast-due-date')).toContainText(shown);

 await page.getByTestId('close-flow').click();await page.getByTestId('tab-history').click();
 const card=page.getByTestId(`love-shelf-item-${reading.id}`);
 await card.scrollIntoViewIfNeeded();await expect(card).toContainText(shown);await expect(card).toContainText('Sealed until then');
 await shot(page,'shelf');
 await card.click();
 await expect(page.getByTestId('check-in-yes')).toBeVisible();await expect(page.getByTestId('forecast-due-date')).toContainText(shown);
 await page.getByTestId('check-in-yes').click();
 await page.getByTestId('close-flow').click();await page.getByTestId('tab-history').click();
 await expect(page.getByTestId(`love-shelf-item-${reading.id}`)).toContainText('Yes');
 log.push({summary:{question:reading.question,cards:answered,headline:reading.headline,horizon:reading.facts.horizon,dueDate:reading.dueDate,shown}});
 console.log(`PASS: teen not offered; adult Love timing asked ${answered.length} card(s) without a horizon, the Ball named ${reading.facts.horizon} (${reading.dueDate}), shown on the reveal and the gold-sealed shelf; check-in saved.\n${reading.headline}`);
}catch(error){log.push({failure:String(error)});if(page)await shot(page,'failure').catch(()=>{});throw error}
finally{await writeFile(`${evidenceDir}/love-timing.json`,JSON.stringify(log,null,2));await browser.close()}
