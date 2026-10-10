// The Ball asks, driven in the web preview against the live engine and local model: the deck, a real AI insight at
// 10 answers, the bonus reading at 25, changing and forgetting answers, a reading whose request carries the relevant
// self answers (and its Shaped by chip when the model names one), and the teen deck.
import {httpCredentials} from './preview-auth.mjs';
import {chromium,expect} from '@playwright/test';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {asks} from '../src/ball-asks.ts';
const url=process.env.VERIFY_URL||'http://localhost:8087',out=process.env.EVIDENCE_DIR||'docs/evidence/ball-asks';
await mkdir('.local',{recursive:true});await mkdir(out,{recursive:true});
const adultOnly=new Set(asks.filter(ask=>ask.only==='adult').map(ask=>ask.question)),log=[];

async function open(birthday,name){
 const profile=await mkdtemp(`${process.cwd()}/.local/ball-asks-${name}-`);
 const context=await chromium.launchPersistentContext(profile,{httpCredentials,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 context.setDefaultTimeout(120000);const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',async response=>{if(response.request().method()==='POST'&&response.url().includes('/engine'))try{log.push({profile:name,request:response.request().postDataJSON(),response:await response.json()})}catch{}});
 await page.goto(url,{timeout:300000});await page.getByTestId('onboarding-birthday').fill(birthday);await page.getByTestId('continue').click();await page.getByTestId('learning-growth').click();await page.getByTestId('meet-the-ball').click();
 await page.getByTestId('tab-you').click();await page.getByTestId('open-ball-asks').click();await page.getByTestId('ask-question').waitFor();
 return {context,page,errors,shot:async file=>{await page.waitForTimeout(1800);await page.screenshot({path:`${out}/${file}.png`})}};
}
async function answer(page,count,seen=[]){
 for(let i=0;i<count;i++){
  // An insight every 10 answers pauses the deck until it lands; a failed one is a failure here.
  await page.getByTestId('ask-question').or(page.getByTestId('ask-insight')).or(page.getByTestId('ask-insight-retry')).first().waitFor({timeout:120000});
  if(await page.getByTestId('ask-insight-retry').count())throw new Error('The live insight failed.');
  if(await page.getByTestId('ask-insight').count()){log.push({insight:await page.getByTestId('ask-insight').innerText()});await page.getByTestId('ask-keep-going').click();i--;continue}
  const question=await page.getByTestId('ask-question').innerText();seen.push(question);
  await page.getByTestId('ask-option-0').click();
  await expect(page.getByTestId('ask-question').filter({hasNotText:question}).or(page.getByTestId('ask-insight-forming')).or(page.getByTestId('ask-insight')).first()).toBeVisible();
 }
 return seen;
}

const adult=await open('1995-06-15','adult');
try{
 const {page,shot}=adult;
 await expect(page.getByTestId('ask-count')).toHaveText('0 answered');await shot('01-first-question');
 const skipped=await page.getByTestId('ask-question').innerText();await page.getByTestId('ask-skip').click();await expect(page.getByTestId('ask-question')).not.toHaveText(skipped);
 await answer(page,3);await expect(page.getByTestId('ask-reflection')).toBeVisible();await shot('02-reflection-progress');
 await answer(page,7);
 await shot('03-insight-forming');
 await page.getByTestId('ask-insight').waitFor({timeout:120000});await shot('04-insight');
 await answer(page,15);
 await expect(page.getByTestId('notice')).toContainText('A bonus reading is yours',{timeout:120000});
 await expect(page.getByTestId('view-plans')).toContainText('2 readings');await shot('05-bonus-reading');
 await page.getByTestId('dismiss-notice').click();
 await page.getByTestId('ask-answers').click();
 const first=page.getByRole('radio',{name:'3 a.m.',exact:true});
 if(await first.count()){await first.click();await expect(first).toHaveAttribute('aria-checked','true')}
 const before=await page.getByTestId('ask-answers').innerText();
 await page.getByRole('button',{name:/^Forget /}).first().click();
 await expect(page.getByTestId('ask-answers')).not.toHaveText(before);await shot('06-change-forget');
 await page.reload();await page.getByTestId('tab-you').click();await expect(page.getByTestId('open-ball-asks')).toContainText('25 answered');await shot('07-you-entry');
 // A personal reading carries only theme-relevant self answers; the reveal shows Shaped by when the model names one.
 await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
 await page.getByTestId('question-input').fill('Will I keep a calmer daily routine this year?');await page.getByTestId('look-into-the-future').click();
 for(let i=0;i<3&&!(await page.getByTestId('share-this-glimpse').count());i++){await page.getByTestId('option-0').or(page.getByTestId('share-this-glimpse')).first().waitFor({timeout:120000});if(await page.getByTestId('option-0').count())await page.getByTestId('option-0').click();await page.waitForTimeout(800)}
 await page.getByTestId('share-this-glimpse').waitFor({timeout:120000});
 const predict=log.filter(entry=>entry.request?.action==='predict').at(-1);
 const sent=Object.keys(predict.request.facts).filter(key=>key.startsWith('self_'));
 if(!sent.length||sent.length>6)throw new Error(`Expected 1-6 self answers with the reading, got ${sent.length}`);
 log.push({selfAnswersSent:sent,shapedBy:predict.response.value?.shapedBy??null});
 if(predict.response.value?.shapedBy)await expect(page.getByTestId('shaped-by')).toBeVisible();
 await shot('08-reveal');
 if(adult.errors.length)throw new Error(adult.errors.join('\n'));
}catch(error){await adult.shot('failure-adult');throw error}finally{await adult.context.close()}

const teen=await open('2011-03-03','teen');
try{
 const seen=await answer(teen.page,9);
 const shown=seen.filter(question=>adultOnly.has(question));
 if(shown.length)throw new Error(`Teen deck showed adult-only questions: ${shown.join(', ')}`);
 await teen.shot('09-teen-deck');
 log.push({teenQuestions:seen});
 if(teen.errors.length)throw new Error(teen.errors.join('\n'));
}catch(error){await teen.shot('failure-teen');throw error}finally{await teen.context.close();await writeFile(`${process.env.LOG_DIR||out}/drive-ball-asks.json`,JSON.stringify(log,null,2))}
console.log('PASS: The Ball asks deck, live insight, bonus reading, change/forget, self answers on a reading, teen deck.');
