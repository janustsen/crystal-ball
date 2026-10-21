import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {seedLadder} from './ladder-seed.mjs';
const base=process.env.VERIFY_URL||'http://localhost:8104';
const env={...process.env,CHROME_DEVTOOLS_AXI_SESSION:`cb-core-pricing-${Date.now()}`};
const evidence='docs/evidence/core-pricing';mkdirSync(evidence,{recursive:true});
const run=script=>execFileSync('chrome-devtools-axi',['run'],{env,input:script,encoding:'utf8',timeout:180000});
try{
 execFileSync('chrome-devtools-axi',['open',base],{env,stdio:'pipe'});
 execFileSync('chrome-devtools-axi',['emulate','--viewport','390x844x1,mobile,touch'],{env,stdio:'pipe'});
 const output=run(`
 const click=async id=>{await page.click('[data-testid="'+id+'"]')};
 const check=async(fn,message)=>{if(!await page.eval(fn))throw Error(message);console.log('PASS '+message)};
 await click('skip-for-now');await click('confirm-age');await click('about-done');
 // Every ladder feature open: the allowance is the daily free question, without the starter.
 await page.wait('[data-testid=tap-to-ask]');await page.eval(async()=>{${seedLadder}});await page.open(${JSON.stringify(base)});await page.wait('[data-testid=tap-to-ask]');await click('view-plans');
 await check(()=>{const r=[...document.querySelectorAll('[role=radio]')];return r.length===2&&r[0].textContent.includes('Weekly')&&r[0].getAttribute('aria-checked')==='true'&&r[0].textContent.includes('$259.48/yr')&&r.every(x=>x.textContent.includes('Renews until canceled in your app store’s subscription settings.'))},'weekly default, yearly equivalent and cancellation terms on both offered plans');
 await check(()=>['$4.99 each week','$9.99 each month','Weekly starts with a 3-day free trial, then $4.99 / week.','10 questions a day','never expire','Test mode · no real payments','An interrupted forecast may use a reading.'].every(x=>document.body.innerText.includes(x))&&!document.body.innerText.includes('$39.99'),'exact prices, trial, allowance, permanent packs, test-mode disclosure and no yearly plan before its cost gate');
 for(let i=0;i<2;i++){await page.eval('document.querySelectorAll("[role=radio]")['+i+'].click()');await check(()=>document.querySelectorAll('[role=radio][aria-checked=true]').length===1,'exactly one plan selected')}
 await click('5-questions-1-99-simulate');await click('20-questions-5-99-simulate');
 await check(()=>document.querySelector('[data-testid=view-plans]').textContent==='26 questions left','both packs add 25 readings at their advertised prices');
 await page.eval(()=>document.querySelectorAll('[role=radio]')[0].click());await click('continue-with-plus-simulate');
 await check(()=>document.querySelector('[data-testid=view-plans]').textContent==='Plus · test','weekly simulated purchase enables Plus');
 await click('close-flow');await click('tap-to-ask');await page.wait('[data-testid=type-instead]');await click('type-instead');
 await page.fill('[data-testid=question-input]','Will I finish writing a novel in 10 years?');await click('look-into-the-future');
 let lastCard='';
 for(let i=0;i<100;i++){
  if(await page.eval(()=>!!document.querySelector('[data-testid=forecast-due-date]')))break;
  const card=await page.eval(()=>document.querySelector('[data-testid=option-0]')?document.body.innerText:'');
  if(card&&card!==lastCard){lastCard=card;await click('option-0')}
  await page.wait(1000);
 }
 await page.wait('[data-testid=forecast-due-date]');
 await check(()=>{const s=JSON.parse(localStorage.getItem('crystal-ball-v1')),p=s.history[0],d=new Date();d.setFullYear(d.getFullYear()+1);const expected=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return p.dueDate===expected&&p.headline.includes('10 years')&&s.credits===25},'real Ollama forecast retains ten-year horizon, check-in clamps to a year and packs remain unspent under Plus');
 console.log(await page.eval(()=>JSON.stringify({reading:JSON.parse(localStorage.getItem('crystal-ball-v1')).history[0]})));
 await click('close-flow');await click('tab-history');
 await page.eval(()=>[...document.querySelectorAll('[role=button]')].find(x=>x.textContent.includes('Will I finish writing a novel in 10 years?')).click());
 await click('check-in-pending');await click('share-this-glimpse');await click('share-reminder');
 await check(()=>document.body.innerText.includes('Native reminder preview'),'web answers with the native-only reminder preview (iOS and Android suppression is tested in tests/love-notifications.test.mjs)');
 await page.open(${JSON.stringify(base)});await click('tab-history');
 await check(()=>document.body.innerText.includes('Not yet'),'answer persists after reload');
 await click('view-plans');
 console.log('PASS paywall opened');
 `);
 writeFileSync(`${evidence}/browser.txt`,output);console.log(output);
 execFileSync('chrome-devtools-axi',['emulate','--viewport','375x667x1,mobile,touch'],{env,stdio:'pipe'});
 const layout=run(`
 const result=await page.eval(()=>{const radios=[...document.querySelectorAll('[role=radio]')];return {width:innerWidth,cards:radios.map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,scroll:x.scrollWidth,client:x.clientWidth,direction:getComputedStyle(x).flexDirection}})}});
 console.log(JSON.stringify(result));
 if(result.cards.some(x=>x.left<0||x.right>result.width||x.scroll>x.client+1))throw Error('Small-screen plan overflow');
 await page.eval(()=>document.querySelector('[role=radio]').scrollIntoView());
 `);writeFileSync(`${evidence}/layout.txt`,layout);console.log(layout);
 try{execFileSync('chrome-devtools-axi',['screenshot',`${evidence}/large-paywall.png`],{env,stdio:'pipe'})}catch(error){if(!existsSync(`${evidence}/large-paywall.png`))throw error}
}catch(error){writeFileSync(`${evidence}/failure.txt`,String(error)+'\n'+(error.stdout||'')+'\n'+(error.stderr||''));throw error}finally{execFileSync('chrome-devtools-axi',['stop'],{env,stdio:'pipe'})}
