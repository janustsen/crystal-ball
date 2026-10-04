import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
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
 await click('skip-for-now');await click('confirm-age');await click('view-plans');
 await check(()=>{const r=[...document.querySelectorAll('[role=radio]')];return r.length===3&&r[0].textContent.includes('Weekly')&&r[0].getAttribute('aria-checked')==='true'&&document.querySelector('[data-testid=selected-plan-terms]').textContent.includes('$103.48/yr')&&document.querySelector('[data-testid=selected-plan-terms]').textContent.includes('renews weekly until canceled')&&document.body.innerText.includes('Cancel anytime in your app store’s subscription settings.')},'weekly default, yearly equivalent, per-plan renewal and shared cancellation route');
 await check(()=>['10 readings daily','never expire','Test mode · no real payments','A reading is never spent if a forecast fails.'].every(x=>document.body.innerText.includes(x)),'exact prices, allowance, permanent packs and test-mode disclosure');
 for(let i=0;i<3;i++){await page.eval('document.querySelectorAll("[role=radio]")['+i+'].click()');await check(()=>{const radios=[...document.querySelectorAll('[role=radio]')],selected=radios.filter(r=>r.getAttribute('aria-checked')==='true'),index=radios.indexOf(selected[0]);return selected.length===1&&selected[0].getAttribute('aria-label')===['Weekly, $1.99 each week','Monthly, $5.99 each month','Yearly, $39.99 each year'][index]&&selected[0].getAttribute('aria-describedby')==='selected-plan-terms'&&document.querySelector('[data-testid=selected-plan-terms]').textContent.includes('renews '+['weekly','monthly','yearly'][index]+' until canceled')},'one plan selected with its advertised price and renewal terms')}
 await click('5-readings-1-99-simulate');await click('20-readings-5-99-simulate');
 await check(()=>document.querySelector('[data-testid=plan-balance]').textContent==='26 readings ready whenever you are.','both packs add 25 readings at their advertised prices');
 await page.eval(()=>document.querySelectorAll('[role=radio]')[0].click());await click('continue-with-plus-simulate');
 await check(()=>!!document.querySelector('[data-testid=turn-off-simulated-plus]'),'weekly simulated purchase enables Plus');
 await click('close-flow');await click('tab-ask');await page.wait('[data-testid=type-instead]');await click('type-instead');
 await page.fill('[data-testid=question-input]','Will I finish writing a novel in 10 years?');await click('look-into-the-future');
 let lastCard='';
 for(let i=0;i<100;i++){
  if(await page.eval(()=>!!document.querySelector('[data-testid=forecast-due-date]')))break;
  const card=await page.eval(()=>document.querySelector('[data-testid=option-0]')?document.body.innerText:'');
  if(card&&card!==lastCard){lastCard=card;await click('option-0');await click('answer-next')}
  await page.wait(1000);
 }
 await page.wait('[data-testid=forecast-due-date]');
 await check(()=>{const s=JSON.parse(localStorage.getItem('crystal-ball-v1')),p=s.history[0],d=new Date();d.setFullYear(d.getFullYear()+1);const expected=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');return p.dueDate===expected&&p.headline.includes('10 years')&&s.credits===25},'real Ollama forecast retains ten-year horizon, check-in clamps to a year and packs remain unspent under Plus');
 console.log(await page.eval(()=>JSON.stringify({reading:JSON.parse(localStorage.getItem('crystal-ball-v1')).history[0]})));
 await click('close-flow');await click('tab-history');
 await page.eval(()=>[...document.querySelectorAll('[role=button]')].find(x=>x.textContent.includes(JSON.parse(localStorage.getItem('crystal-ball-v1')).history[0].headline)).click());
 await click('check-in-pending');await check(()=>!JSON.parse(localStorage.getItem('crystal-ball-v1')).history[0].outcome,'selection stays unsaved');await click('save-outcome');await check(()=>document.querySelector('[data-testid=check-in-status]').textContent==='Saved · Not yet','explicit outcome save');await click('share-this-glimpse');await click('share-more');await click('share-reminder');
 await check(()=>document.body.innerText.includes('Your check-in is saved.'),'Not yet suppresses new reminders');
 await page.open(${JSON.stringify(base)});await click('tab-history');
 await check(()=>document.body.innerText.includes('Not yet'),'answer persists after reload');
 await click('tab-you');await page.eval(()=>document.querySelector('[role=switch][aria-label="Large text"]').click());
 await click('view-plans');
 console.log('PASS large-text paywall opened');
 `);
 writeFileSync(`${evidence}/browser.txt`,output);console.log(output);
 execFileSync('chrome-devtools-axi',['emulate','--viewport','375x667x1,mobile,touch'],{env,stdio:'pipe'});
 const layout=run(`
 const result=await page.eval(()=>{const radios=[...document.querySelectorAll('[role=radio]')];return {width:innerWidth,cards:radios.map(x=>{const r=x.getBoundingClientRect();return {left:r.left,right:r.right,scroll:x.scrollWidth,client:x.clientWidth}})}});
 console.log(JSON.stringify(result));
 if(result.cards.some(x=>x.left<0||x.right>result.width||x.scroll>x.client+1))throw Error('Large-text plan overflow');
 await page.eval(()=>document.querySelector('[role=radio]').scrollIntoView());
 `);writeFileSync(`${evidence}/layout.txt`,layout);console.log(layout);
 try{execFileSync('chrome-devtools-axi',['screenshot',`${evidence}/large-paywall.png`],{env,stdio:'pipe'})}catch(error){if(!existsSync(`${evidence}/large-paywall.png`))throw error}
}catch(error){writeFileSync(`${evidence}/failure.txt`,String(error)+'\n'+(error.stdout||'')+'\n'+(error.stderr||''));throw error}finally{execFileSync('chrome-devtools-axi',['stop'],{env,stdio:'pipe'})}
