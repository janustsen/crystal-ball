// Layout regression: no screen may overflow the phone shell horizontally at 360/390/430px.
// Engine replies are a labeled layout fixture (not a model pass) so every screen is reachable without Ollama.
import {httpCredentials} from './preview-auth.mjs';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8087',evidence=process.env.LAYOUT_EVIDENCE||'.local/layout';
const plan={topic:'general',provided:{},cards:[{id:'context_a',question:'How settled is your plan right now, honestly?',options:['Barely started','Halfway there','Nearly certain','Other'],remember:false},{id:'context_b',question:'What usually gets in your way?',options:['Time','Money','Nerve','Other'],remember:false}]};
const prediction={id:'layout-fixture',question:'Will I be conversational in Spanish in six months?',headline:'By spring you will hold a twenty-minute conversation in Spanish',createdAt:new Date().toISOString(),label:'Speculative · moderate confidence',why:'Layout fixture text.',facts:{context_a:'Halfway there'},sources:[],assumptions:['Layout fixture assumption.'],friend:false};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const failures=[],checked=[];
async function audit(page,width,name){
 await page.waitForTimeout(1300);
 const bad=await page.evaluate(()=>{
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
 if(bad.length){failures.push({width,name,bad});await page.screenshot({path:`${evidence}/fail-${width}-${name}.png`})}
 if(width===390)await page.screenshot({path:`${evidence}/${name}.png`});
}
await mkdir(evidence,{recursive:true});
for(const width of [360,390,430])for(const large of [false,true]){
 const context=await browser.newContext({httpCredentials,viewport:{width,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const page=await context.newPage(),tag=large?'-large':'';
 if(large)await context.addInitScript(()=>{if(!localStorage.getItem('crystal-ball-v1'))localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:0,plus:false,usage:{day:new Date().toISOString().slice(0,10),count:0},reduceMotion:false,largeText:true}))});
 await page.route(`${base}/engine`,async route=>{const action=route.request().postDataJSON()?.action;await route.fulfill({contentType:'application/json',body:JSON.stringify(action==='plan'?{kind:'ok',value:plan}:action==='predict'?{kind:'ok',value:{...prediction,id:`layout-${Date.now()}`}}:{kind:'error',message:'Layout fixture.'})})});
 const tap=id=>page.getByTestId(id).click();
 await page.goto(base);await page.getByTestId('tab-ask').waitFor();
 await audit(page,width,'home'+tag);
 for(const t of ['sky','history','you']){await tap(`tab-${t}`);await audit(page,width,t+tag)}
 await tap('view-plans');await audit(page,width,'paywall'+tag);await tap('close-flow');await tap('tab-home');
 await tap('hero-orb');await audit(page,width,'approach'+tag);await page.getByTestId('type-instead').waitFor();await audit(page,width,'listening'+tag);
 await tap('type-instead');await page.getByTestId('question-input').fill('Will I be conversational in Spanish in six months?');await audit(page,width,'ask'+tag);
 await tap('look-into-the-future');await page.getByTestId('option-0').waitFor();await audit(page,width,'card-1'+tag);
 await tap('option-3');await audit(page,width,'card-other'+tag);await page.getByTestId('other-input').fill('Somewhere between halfway and nearly');await tap('answer-next');
 await page.getByTestId('option-0').waitFor();await audit(page,width,'card-2'+tag);await tap('option-0');
 await page.getByTestId('why-disclosure').waitFor();await audit(page,width,'reveal'+tag);await tap('why-disclosure');await audit(page,width,'reveal-why'+tag);
 await page.getByText('Share this glimpse').click();await audit(page,width,'share'+tag);await tap('close-flow');await tap('close-flow');
 await tap('tab-history');await audit(page,width,'history-filled'+tag);
 await page.getByText(prediction.headline).first().click();await page.getByTestId('check-in-yes').waitFor();await audit(page,width,'check-in'+tag);await tap('close-flow');
 await context.close();
}
await browser.close();
await writeFile(`${evidence}/layout.json`,JSON.stringify({base,checked,failures},null,1));
console.log(JSON.stringify({checked:checked.length,failures},null,1));
if(failures.length)process.exit(1);
