// Drives Year ahead on a loopback web preview with live Ollama: the shelf offer, the simulated $9.99 purchase that seals
// twelve real model forecasts, a sealed ball refusing to open, opening this month's ball into the reveal and History,
// the next month's ball opening on its 1st (browser clock moved forward) with last month's check-in, and the yearly plan's grant.
// PREVIEW_URL=http://localhost:8087 node scripts/drive-year-ahead.mjs; evidence lands in YEAR_EVIDENCE (default .local/year-ahead).
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.PREVIEW_URL||'http://localhost:8087',out=process.env.YEAR_EVIDENCE||'.local/year-ahead';
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results={},errors=[];
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')));
const month=(offset=0)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
async function start(context){
 const page=await context.newPage();
 page.setDefaultNavigationTimeout(180000);
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();
 await page.getByTestId('hero-orb').waitFor();
 return page;
}
// The screen's enter transition scales its content, so measurements wait for it to settle.
const library=async page=>{await page.getByTestId('tab-home').click();await page.getByTestId('room-inner-library').click();await page.getByTestId('year-ahead').waitFor();await page.waitForTimeout(2500)};
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.clock.install({time:new Date()});
 const page=await start(context);
 await library(page);
 const buy=page.getByTestId('year-ahead-buy');
 assert.match(await buy.innerText(),/\$9\.99/);
 assert.equal(await page.getByRole('button',{name:/sealed until/}).count(),0,'the offer shelf is decorative');
 await page.screenshot({path:`${out}/offer.png`});
 const caption=await page.getByTestId(`year-ahead-${month(0)}`).evaluate(e=>getComputedStyle([...e.querySelectorAll('div')].filter(d=>d.textContent&&!d.children.length).at(-1)).color);
 assert.equal(caption,'rgb(220, 207, 186)','month captions keep the muted caption ink');

 let yearRequests=0;page.on('request',r=>{if(r.method()==='POST'&&r.postData()?.includes('"action":"year"'))yearRequests++});
 const started=Date.now();
 await buy.click();
 // Leaving and returning mid-seal keeps the shelf busy rather than offering a second generation.
 await library(page);
 await page.getByText('The Ball is writing twelve months').waitFor();
 assert.ok(await page.getByTestId('year-ahead-seal').isDisabled(),'Seal my year stays disabled while sealing');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).yearAhead?.kind==='sealed',null,{timeout:240000,polling:1000});
 await page.getByTestId(`year-ahead-${month(0)}`).and(page.getByRole('button',{name:/ready to open/})).waitFor();
 const year=(await saved(page)).yearAhead;
 assert.equal(yearRequests,1,'one sealing request');
 assert.equal(year.kind,'sealed');assert.equal(year.source,'purchase');
 assert.deepEqual(year.months.map(m=>m.month),Array.from({length:12},(_,i)=>month(i)));
 results.sealed={ms:Date.now()-started,months:year.months.map(m=>`${m.month}: ${m.headline}`)};
 await page.getByTestId('year-ahead').screenshot({path:`${out}/sealed-shelf.png`});

 await page.getByTestId(`year-ahead-${month(1)}`).click();
 await page.getByTestId('year-ahead-notice').filter({hasText:'opens on'}).waitFor();
 assert.match(await page.getByTestId(`year-ahead-${month(1)}`).getAttribute('aria-label'),/sealed until/);

 await page.getByTestId(`year-ahead-${month(0)}`).click();
 await page.getByText(year.months[0].headline).waitFor();await page.waitForTimeout(5000);
 await page.screenshot({path:`${out}/opened-reveal.png`});
 const history=(await saved(page)).history;
 assert.equal(history[0].id,year.months[0].id);
 results.opened={label:history[0].label,dueDate:history[0].dueDate};
 assert.equal(history[0].dueDate,`${month(1)}-01`);

 // The next month's 1st: its ball opens and this month's forecast is ready for its check-in.
 await page.getByTestId('close-flow').click();
 await page.clock.setSystemTime(new Date(`${month(1)}-01T09:00:00`));
 await page.reload();await page.getByTestId('hero-orb').waitFor();
 await library(page);
 assert.match(await page.getByTestId(`year-ahead-${month(0)}`).getAttribute('aria-label'),/opened/);
 assert.match(await page.getByTestId(`year-ahead-${month(1)}`).getAttribute('aria-label'),/ready to open/);
 await page.getByTestId('year-ahead').screenshot({path:`${out}/next-month-shelf.png`});
 await page.getByTestId('tab-history').click();
 await page.getByText('Ready to check in').first().waitFor();
 await page.getByText(year.months[0].headline).click();
 await page.getByTestId('check-in-yes').click();
 assert.equal((await saved(page)).history.find(p=>p.id===year.months[0].id).outcome,'yes');
 results.checkIn='yes saved on the 1st of the next month';
 await page.reload();await page.getByTestId('hero-orb').waitFor();await library(page);
 assert.equal((await saved(page)).history.find(p=>p.id===year.months[0].id).outcome,'yes');
 await page.getByTestId(`year-ahead-${month(1)}`).click();
 await page.getByText(year.months[1].headline).waitFor();
 assert.equal((await saved(page)).history.filter(p=>p.id===year.months[1].id).length,1);
 await page.screenshot({path:`${out}/next-month-reveal.png`});
 results.nextMonth='second ball opened; previous check-in persisted after reload';
 await context.close();

 // The yearly plan includes Year ahead: owned and ready to seal without a second purchase.
 const yearly=await browser.newContext({viewport:{width:360,height:740}}),plan=await start(yearly);
 await plan.getByTestId('view-plans').click();
 await plan.getByRole('radio',{name:/Yearly/}).click();
 assert.match(await plan.getByRole('radio',{name:/Yearly/}).innerText(),/Year ahead included/);
 await plan.getByTestId('continue-with-plus-simulate').click();
 await plan.getByTestId('close-flow').click();
 await library(plan);
 await plan.getByTestId('year-ahead-seal').waitFor();
 assert.deepEqual((await saved(plan)).yearAhead,{kind:'owned',source:'yearly'});
 // 200% text at 360px: the shelf stays inside the phone shell.
 await plan.evaluate(()=>{const s=JSON.parse(localStorage.getItem('crystal-ball-v1'));localStorage.setItem('crystal-ball-v1',JSON.stringify({...s,largeText:true}))});
 await plan.reload();await plan.getByTestId('hero-orb').waitFor();await library(plan);
 const overflow=await plan.evaluate(()=>{const shell=document.querySelector('[data-testid="app-shell"]').getBoundingClientRect();return [...document.querySelectorAll('[data-testid="year-ahead"] *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.left<shell.left-1||r.right>shell.right+1)}).length+(document.documentElement.scrollWidth>innerWidth?1:0)});
 assert.equal(overflow,0,'Year ahead overflows the shell at 200% text');
 await plan.screenshot({path:`${out}/yearly-large-text.png`,fullPage:true});
 results.yearly='owned via Yearly; no overflow at 360px and 200% text';
 await yearly.close();
 assert.deepEqual(errors.filter(e=>!/room clip unavailable|favicon/.test(e)),[],'console errors');
 writeFileSync(`${out}/drive-year-ahead.json`,JSON.stringify(results,null,1)+'\n');
 console.log(JSON.stringify(results,null,1));
}finally{await browser.close()}
