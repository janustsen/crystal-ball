// Layout regression: no screen may overflow the phone shell horizontally at 360/390/430px.
// Engine replies are a labeled layout fixture (not a model pass) so every screen is reachable without Ollama.
// At 390px it also holds every visible label to WCAG AA contrast against what is actually rendered behind it: 4.5:1,
// or 3:1 for large text (24px and up, or 18.66px and up when bold).
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {labelContrast} from './layout-contrast.mjs';
const base=process.env.PREVIEW_URL||'http://localhost:8087',evidence=process.env.LAYOUT_EVIDENCE||'.local/layout';
const plan={topic:'general',provided:{},cards:[{id:'context_a',question:'How settled is your plan right now, honestly?',options:['Barely started','Halfway there','Nearly certain','Other'],remember:false},{id:'context_b',question:'What usually gets in your way?',options:['Time','Money','Nerve','Other'],remember:false},{id:'context_c',question:'Who can help you keep going?',options:['A friend','A teacher','Just me','Other'],remember:false}]};
// Facts and assumptions exercise their 300/200-character input limits; news titles are unbounded.
const longFact='I practise with a conversation partner after work and review difficult phrases every weekend. '.repeat(4).slice(0,300);
const longAssumption='You keep making time for regular practice and feedback even when your weekly schedule changes. '.repeat(3).slice(0,200);
const prediction={id:'layout-fixture',question:'Will I be conversational in Spanish in six months?',headline:'By spring you will hold a twenty-minute conversation in Spanish',createdAt:new Date().toISOString(),label:'Speculative · moderate confidence',why:`Recorded context: ${longFact} This scenario assumes ${longAssumption} Dated news headlines below add background; they do not verify this prediction.`,facts:{context_a:longFact,context_b:longFact,context_c:longFact},sources:Array.from({length:3},(_,index)=>({title:`Layout source ${index+1}: ${'Language learners describe sustained practice, changing schedules and community conversation groups. '.repeat(5).slice(0,400)}`,url:`https://example.com/layout-source-${index+1}`,date:'2026-10-01',publisher:'Synthetic international language and education research publication'})),assumptions:[longAssumption],friend:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
const failures=[],checked=[],contrast=[];
// Every visible label against the pixels behind it: its glyphs are hidden for one screenshot (their shadow halo stays,
// as it is drawn behind them), the box of its lines is sampled on a grid, and the worst tenth of those samples sets the ratio.
// Labels scrolled out of view or under another layer (the tab bar) are skipped; disabled controls are exempt, as in WCAG.
// `fadeTop` skips scrolled content still inside the tab's fade beneath the header; the header itself stays measured.
async function measureContrast(page,name,fadeTop=0){
 const labels=await page.evaluate(fadeTop=>{
  const shell=document.querySelector('[data-testid="app-shell"]'),out=[];
  for(const el of shell.querySelectorAll('*')){
   if(![...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
   if(el.closest('[aria-hidden="true"],[aria-disabled="true"],[disabled]'))continue;
   const s=getComputedStyle(el),range=document.createRange(),boxes=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).flatMap(n=>{range.selectNodeContents(n);return [...range.getClientRects()]});
   // The glyphs' own line boxes, not the element's: a centred caption's full-width block is mostly empty room.
   let r=boxes.reduce((u,b)=>u?new DOMRect(Math.min(u.left,b.left),Math.min(u.top,b.top),Math.max(u.right,b.right)-Math.min(u.left,b.left),Math.max(u.bottom,b.bottom)-Math.min(u.top,b.top)):b,null);if(!r)continue;const full=r.width*r.height;
   for(let e=el.parentElement;e&&r;e=e.parentElement)if(getComputedStyle(e).overflow!=='visible'){const c=e.getBoundingClientRect(),left=Math.max(r.left,c.left),top=Math.max(r.top,c.top),right=Math.min(r.right,c.right),bottom=Math.min(r.bottom,c.bottom);r=right>left&&bottom>top?new DOMRect(left,top,right-left,bottom-top):null}
   if(!r||r.top<0||r.top<fadeTop&&window.layoutScroller?.contains(el)||r.width<2||r.height<2||r.width*r.height<.6*full||r.bottom<0||r.top>innerHeight||s.visibility==='hidden')continue;
   const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   if(!hit||!(el.contains(hit)||hit.contains(el)))continue;
   let opacity=1;for(let e=el;e;e=e.parentElement)opacity*=Number(getComputedStyle(e).opacity);
   if(opacity<.05)continue;
   const rgba=s.color.match(/[\d.]+/g).map(Number);
   el.setAttribute('data-contrast',out.length);
   out.push({text:el.textContent.trim().slice(0,40),large:parseFloat(s.fontSize)>=24||parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700,box:[r.left,Math.max(0,r.top),r.width,Math.min(innerHeight,r.bottom)-Math.max(0,r.top)],rgb:rgba.slice(0,3),alpha:(rgba[3]??1)*opacity});
  }
  const style=document.createElement('style');style.id='contrast-hide';style.textContent='[data-contrast]{color:transparent!important;-webkit-text-fill-color:transparent!important}';document.head.append(style);
  return out;
 },fadeTop);
 await page.waitForTimeout(50);
 const shot=await page.screenshot();
 await page.evaluate(()=>{document.getElementById('contrast-hide')?.remove();document.querySelectorAll('[data-contrast]').forEach(e=>e.removeAttribute('data-contrast'))});
 const {data,info}=await sharp(shot).removeAlpha().raw().toBuffer({resolveWithObject:true}),k=info.width/page.viewportSize().width;
 for(const l of labels){
  const samples=[];
  for(let i=0;i<8;i++)for(let j=0;j<3;j++){
   const x=Math.min(info.width-1,Math.round((l.box[0]+l.box[2]*(i+.5)/8)*k)),y=Math.min(info.height-1,Math.round((l.box[1]+l.box[3]*(j+.5)/3)*k)),o=(y*info.width+x)*3;
   samples.push({rgb:[data[o],data[o+1],data[o+2]],x:x/k,y:y/k});
  }
  const result=labelContrast(l,samples);
  if(result.ratio<(l.large?3:4.5))contrast.push({name,text:l.text,large:l.large,ratio:Number(result.ratio.toFixed(2)),text_luminance:Number(result.foreground.toFixed(3)),background:result.background.map(v=>Number(v.toFixed(3))),box:l.box.map(Math.round)});
 }
}
async function audit(page,width,name,marker,delay=1300){
 await expect(marker).toBeVisible();
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
 if(width===390){await page.screenshot({path:`${evidence}/${name}.png`});await measureContrast(page,name)}
}
// Tab content scrolls over the room: every label must read wherever it is scrolled, not only at rest.
async function scrolledContrast(page,name){
 const fade=await page.getByTestId('view-plans').evaluate(pill=>pill.getBoundingClientRect().bottom+44),steps=await page.evaluate(()=>{const s=[...document.querySelectorAll('[data-testid="app-shell"] *')].filter(e=>e.scrollHeight>e.clientHeight+20&&getComputedStyle(e).overflowY==='auto').sort((a,b)=>b.clientHeight-a.clientHeight)[0];window.layoutScroller=s;return s?Math.ceil((s.scrollHeight-s.clientHeight)/300):0});
 for(let i=1;i<=steps;i++){await page.evaluate(y=>{window.layoutScroller.scrollTop=y},i*300);await page.waitForTimeout(200);await measureContrast(page,`${name}-scrolled-${i*300}`,fade)}
 if(steps)await page.evaluate(()=>{window.layoutScroller.scrollTop=0});
}
await mkdir(evidence,{recursive:true});
try{
// Focused regression for the second follow-up: all choices fit without scrolling under the ball.
const followups=[
 {name:'short',question:'What kinds of activities do you enjoy most right now?',options:['Hiking in nature','Cooking with family','Reading books','Other']},
 {name:'long',question:'How much time do you currently spend each week practicing the skills your manager said you need before being considered for a promotion?',options:['Under an hour','One to three hours','Four or more hours','Other']},
 {name:'wrapped',question:'How much time do you currently spend each week practicing the skills your manager said you need before being considered for a promotion?',options:['Less than an hour in total each week','Between one and three hours each week','More than four hours in total each week','Other']},
];
for(const [width,height] of [[375,667],[440,956]])for(const fixture of followups){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 try{
  const page=await context.newPage();
  const cards=[plan.cards[0],{id:'context_b',...fixture,remember:false}];
  await page.route(`${base}/engine`,route=>route.fulfill({json:{kind:'ok',value:{...plan,cards}}}));
  await page.goto(base,{timeout:120000});
  await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();
  await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
  await page.getByTestId('question-input').fill('Will I have a good month?');await page.getByTestId('look-into-the-future').click();
  await page.getByTestId('option-0').click();
  const question=page.getByText(cards[1].question,{exact:true});
  await expect(question).toBeVisible();await page.waitForTimeout(1800);
  await expect(question).toBeInViewport({ratio:1});
  const before=await question.boundingBox();
  expect(before.y).toBeGreaterThan((await page.getByTestId('close-flow').boundingBox()).y+44);
  for(let i=0;i<4;i++)await expect(page.getByTestId(`option-${i}`)).toBeInViewport({ratio:1});
  const boxes=await Promise.all([0,1,2,3].map(i=>page.getByTestId(`option-${i}`).boundingBox()));
  for(const box of boxes){expect(box.width).toBe(boxes[0].width);if(fixture.name!=='wrapped')expect(box.height).toBe(boxes[0].height)}
  // Scroll the actual containing viewport, then ensure the question has not moved behind the ball.
  await question.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.scrollHeight>p.clientHeight&&getComputedStyle(p).overflowY==='auto'){p.scrollTop=p.scrollHeight;break}});
  expect((await question.boundingBox()).y).toBe(before.y);
  await page.screenshot({path:`${evidence}/followup-${width}-${fixture.name}.png`});
  await page.getByTestId('close-flow').click();
  await expect(page.getByText(cards[0].question,{exact:true})).toBeInViewport({ratio:1});
  await page.getByTestId('option-0').click();
  await expect(question).toBeInViewport({ratio:1});
  for(let i=0;i<4;i++)await expect(page.getByTestId(`option-${i}`)).toBeInViewport({ratio:1});
  await page.getByTestId('option-3').click();await expect(page.getByTestId('other-input')).toBeVisible();
  checked.push(`${width}x${height}:second-followup-${fixture.name}`);
  console.log(`Checked ${width}x${height}:second-followup-${fixture.name}`);
 }finally{await context.close()}
}
if(!process.env.LAYOUT_FOLLOWUPS_ONLY)
for(const width of [360,390,430])for(const large of [false,true]){
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
 // The engine's own short error fits the desk card at normal text; the long fixture above keeps its lit panel.
 const shortError={kind:'error',message:'The mist is too thick. Please try again.'};
 const blocked={kind:'blocked',category:'self_harm',message:'Layout fixture: this question needs support from someone you trust, not a prediction.'};
 await page.goto(base,{timeout:120000});await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();await page.getByTestId('tab-ask').waitFor();
 await check('home',page.getByTestId('hero-orb'));
 await tap('tab-sky');await check('sky',page.getByTestId('tonights-sky'));if(width===390)await scrolledContrast(page,'sky'+tag);
 await tap('tab-history');await check('history',text('Your first glimpse belongs here.'));if(width===390)await scrolledContrast(page,'history'+tag);
 await tap('tab-you');await check('you',text('What the Ball remembers'));if(width===390)await scrolledContrast(page,'you'+tag);
 await tap('open-settings');await check('settings',text('Ambient sound'));if(width===390)await scrolledContrast(page,'settings'+tag);
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
 await reply('plan',shortError);await check('error-plan',text('The mist is too thick.'));
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
 await writeFile(`${evidence}/layout.json`,JSON.stringify({base,fixture:'Synthetic engine layout replies; no model or predictive-accuracy claim.',checked,failures,contrast},null,1)+'\n');
}
console.log(JSON.stringify({checked:checked.length,failures,contrast},null,1));
if(failures.length||contrast.length)process.exit(1);
