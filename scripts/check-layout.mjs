// Layout regression: no screen may overflow the phone shell horizontally at 360/390/430px.
// Engine replies are a labeled layout fixture (not a model pass) so every screen is reachable without Ollama.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8087',evidence=process.env.LAYOUT_EVIDENCE||'.local/layout';
const plan={topic:'general',provided:{},cards:[{id:'context_a',question:'How settled is your plan right now, honestly?',options:['Barely started','Halfway there','Nearly certain','Other'],remember:false},{id:'context_b',question:'What usually gets in your way?',options:['Time','Money','Nerve','Other'],remember:false},{id:'context_c',question:'Who can help you keep going?',options:['A friend','A teacher','Just me','Other'],remember:false}]};
// Facts and assumptions exercise their 300/200-character input limits; news titles are unbounded.
const longFact='I practise with a conversation partner after work and review difficult phrases every weekend. '.repeat(4).slice(0,300);
const longAssumption='You keep making time for regular practice and feedback even when your weekly schedule changes. '.repeat(3).slice(0,200);
const prediction={id:'layout-fixture',question:'Will I be conversational in Spanish in six months?',headline:'By spring you will hold a twenty-minute conversation in Spanish',createdAt:new Date().toISOString(),label:'Speculative · moderate confidence',why:`Recorded context: ${longFact} This scenario assumes ${longAssumption} Dated news headlines below add background; they do not verify this prediction.`,facts:{context_a:longFact,context_b:longFact,context_c:longFact},sources:Array.from({length:3},(_,index)=>({title:`Layout source ${index+1}: ${'Language learners describe sustained practice, changing schedules and community conversation groups. '.repeat(5).slice(0,400)}`,url:`https://example.com/layout-source-${index+1}`,date:'2026-10-01',publisher:'Synthetic international language and education research publication'})),assumptions:[longAssumption],friend:false};
if(process.env.LAYOUT_WIDTH&&![360,390,430].includes(Number(process.env.LAYOUT_WIDTH)))throw new Error('LAYOUT_WIDTH must be 360, 390 or 430');
const browser=await chromium.launch({channel:'chrome',headless:true});
const failures=[],checked=[],controls=[];
async function audit(page,width,name,marker,delay=1300){
 await expect(marker).toBeVisible();
 if(process.env.UX_CAPTURE&&width===390&&!name.endsWith('-large')){
  await page.waitForTimeout(90);await page.screenshot({path:`${evidence}/${name}-transition.png`});
  controls.push({name,targets:await page.locator('[role=button],[role=tab],[role=radio],[role=switch],input,textarea').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return {role:el.getAttribute('role'),label:el.getAttribute('aria-label')||el.textContent?.slice(0,80),width:r.width,height:r.height}}))});
 }
 await page.waitForTimeout(delay);
 const bad=await marker.evaluate(marker=>{
  if(!marker.isConnected||!marker.getBoundingClientRect().height)throw new Error('Expected screen disappeared before measurement');
  const shell=document.querySelector('[data-testid="app-shell"]').getBoundingClientRect(),out=[];
  if(document.documentElement.scrollWidth>innerWidth+1)out.push(`document scrollWidth ${document.documentElement.scrollWidth} > ${innerWidth}`);
  for(const el of document.querySelectorAll('[data-testid="app-shell"] *')){
   if(el.closest('.atmosphere,[aria-hidden="true"]'))continue;
   const r=el.getBoundingClientRect(),s=getComputedStyle(el);
   if(!r.width||!r.height||s.visibility==='hidden'||s.position==='fixed')continue;
   if(r.left<shell.left-1||r.right>shell.right+1)out.push(`${el.tagName.toLowerCase()}${el.dataset.testid?`#${el.dataset.testid}`:''} "${(el.textContent||'').trim().slice(0,30)}" ${Math.round(r.left)}..${Math.round(r.right)} outside ${Math.round(shell.left)}..${Math.round(shell.right)}`);
  }
  for(const sc of document.querySelectorAll('[data-testid="app-shell"] *'))if(sc.scrollLeft>0)out.push(`scrolled horizontally by ${sc.scrollLeft}`);
  return out.slice(0,8);
 });
 checked.push(`${width}:${name}`);
 console.log(`Checked ${width}:${name}`);
 if(bad.length){failures.push({width,name,bad});await page.screenshot({path:`${evidence}/fail-${width}-${name}.png`})}
 if(width===390)await page.screenshot({path:`${evidence}/${name}.png`});
}
await mkdir(evidence,{recursive:true});
try{
for(const width of (process.env.LAYOUT_WIDTH?[Number(process.env.LAYOUT_WIDTH)]:[360,390,430]))for(const large of [false,true]){
 const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 try{
 const page=await context.newPage(),tag=large?'-large':'';
 if(large)await context.addInitScript(()=>{if(!localStorage.getItem('crystal-ball-v1'))localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,largeText:true}))});
 const held={};
 await page.route(`${base}/engine`,async route=>{
  const action=route.request().postDataJSON()?.action;
  if(action==='plan'||action==='predict'){held[action]=route;return}
  await route.fulfill({contentType:'application/json',body:JSON.stringify({kind:'error',message:'Layout fixture.'})});
 });
 const reply=async(action,result)=>{
  await expect.poll(()=>!!held[action]).toBe(true);
  const route=held[action];delete held[action];
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
 };
 const tap=id=>page.getByTestId(id).click();
 const text=value=>page.getByText(value,{exact:true});
 const check=(name,marker,delay)=>audit(page,width,name+tag,marker,delay);
 const planning=text('Checking the question and finding what matters.');
 const research=text('Looking for current context and forming your forecast.');
 const error={kind:'error',message:'Layout fixture: the engine could not complete this reading. Nothing was charged.'};
 const blocked={kind:'blocked',category:'self_harm',message:'Layout fixture: this question needs support from someone you trust, not a prediction.'};
 await page.goto(base,{timeout:120000});await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('tab-ask').waitFor();
 await check('home',page.getByTestId('hero-orb'));
 await tap('tab-sky');await check('sky',page.getByTestId('tonights-sky'));
 await tap('tab-history');await check('history',text('Your first glimpse belongs here.'));
 await tap('tab-you');await check('you',text('What the Ball remembers'));
 await tap('view-plans');await check('paywall',text('Crystal Ball Plus'));
 if(width===390){
  const cards=page.getByRole('radio');
  await cards.first().evaluate(element=>element.scrollIntoView({block:'start'}));
  await expect(cards.nth(0)).toBeInViewport({ratio:1});await expect(cards.nth(1)).toBeInViewport({ratio:1});
  await page.screenshot({path:`${evidence}/paywall${tag}.png`});
 }
 await tap('continue-with-plus-simulate');await tap('dismiss-notice');await tap('close-flow');await tap('tab-home');
 await tap('hero-orb');await check('approach',text('Come closer…'),0);
 await check('listening',page.getByTestId('type-instead'));
 await tap('type-instead');await page.getByTestId('question-input').fill(prediction.question);await check('ask',page.getByTestId('question-input'));
 await tap('look-into-the-future');await check('planning',planning);
 await reply('plan',error);await check('error-plan',text('The mist is too thick.'));
 await tap('try-again');await expect(planning).toBeVisible();await reply('plan',blocked);
 await check('sensitive-plan',text('This one isn’t for the Ball.'));
 await tap('edit-question');await tap('look-into-the-future');await expect(planning).toBeVisible();await reply('plan',{kind:'ok',value:plan});
 await check('card-1',text(plan.cards[0].question));
 await tap('option-3');await check('card-other',page.getByTestId('other-input'));await page.getByTestId('other-input').fill('Somewhere between halfway and nearly');await tap('answer-next');
 await check('card-2',text(plan.cards[1].question));await tap('option-0');
 await check('card-3',text(plan.cards[2].question));await tap('option-0');
 await check('research',research);await reply('predict',error);
 await check('error-predict',page.getByTestId('review-answers'));
 await tap('try-again');await expect(research).toBeVisible();await reply('predict',blocked);
 await check('sensitive-predict',text('This one isn’t for the Ball.'));
 await tap('edit-question');await tap('look-into-the-future');await expect(planning).toBeVisible();await reply('plan',{kind:'ok',value:plan});
 for(const card of plan.cards){await expect(text(card.question)).toBeVisible();await tap('option-0')}
 await expect(research).toBeVisible();await reply('predict',{kind:'ok',value:prediction});
 await check('reveal',page.getByTestId('why-disclosure'));await tap('why-disclosure');await expect(text(prediction.why)).toBeVisible();
 for(const source of prediction.sources)await expect(text(source.title)).toBeVisible();
 await check('reveal-why',text('Behind the mist'));
 await tap('share-this-glimpse');await check('share',page.getByTestId('preview-story-card'));
 await tap('preview-story-card');await check('story',page.getByTestId('back-to-sharing'));
 await tap('back-to-sharing');await tap('close-flow');await tap('close-flow');
 await tap('tab-history');await check('history-filled',text(prediction.headline));
 await text(prediction.headline).click();await check('check-in',page.getByTestId('check-in-yes'));
 }finally{await context.close()}
}
}finally{
 await browser.close();
 await writeFile(`${evidence}/controls.json`,JSON.stringify(controls,null,1));
 await writeFile(`${evidence}/layout.json`,JSON.stringify({base,fixture:'Synthetic engine layout replies; no model or predictive-accuracy claim.',checked,failures},null,1)+'\n');
}
console.log(JSON.stringify({checked:checked.length,failures},null,1));
if(failures.length)process.exit(1);
