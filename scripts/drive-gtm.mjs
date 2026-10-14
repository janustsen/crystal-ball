// Go-to-market loops, driven in the web preview against the live engine and local model: the optional
// "Where did you hear about us?" tap (an anonymous count), the soft Plus offer after the first reveal, the paywall's
// launch prices, the web address on every story card (forecast, omen, portrait), web friend links, and the one free
// web reading for invited visitors. Only the OS share sheet is mocked. Proves behaviour, not predictive accuracy.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {httpCredentials,previewFetch} from './preview-auth.mjs';
const base=process.env.VERIFY_URL||'http://localhost:8096',out=process.env.EVIDENCE_DIR||'docs/evidence/gtm',site=new URL(base).host;
await mkdir(out,{recursive:true});
const health=await previewFetch(`${base}/engine/health`).then(r=>r.json());
expect(health).toMatchObject({app:'crystal-ball',provider:'ollama'});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const log={health,site,boundary:'Real Ollama readings, omen and insight; navigator.share is mocked.'},errors=[];

async function open(name){
 const context=await browser.newContext({httpCredentials,viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 const page=await context.newPage(),engine=[];page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
 page.on('request',r=>{if(r.url()===`${base}/engine`&&r.method()==='POST')engine.push({body:r.postDataJSON(),authorization:r.headers().authorization??null})});
 await page.addInitScript(()=>{
  window.storyText=[];window.shared=[];
  const draw=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,...rest){window.storyText.push(text);return draw.call(this,text,...rest)};
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.shared.push(data)}});
 });
 return {context,page,engine,shot:async file=>{await page.waitForTimeout(1500);await page.screenshot({path:`${out}/${file}.png`})}};
}
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')));
async function exportCard(page,name){
 const preview=page.getByRole('img',{name:'Your exported forecast card'});
 await expect(preview).toBeVisible({timeout:60000});
 expect(await preview.evaluate(img=>[img.naturalWidth,img.naturalHeight])).toEqual([1080,1920]);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByTestId('export-story-card').click()]);
 await download.saveAs(`${out}/${name}.png`);
 const text=await page.evaluate(()=>window.storyText);
 expect(text).toContain(site);
 return {file:download.suggestedFilename(),text};
}
async function read(page,question){
 await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
 await page.getByTestId('question-input').fill(question);await page.getByTestId('look-into-the-future').click();
 for(let i=0;i<3;i++){
  await page.getByTestId('option-0').or(page.getByTestId('record-reveal')).first().waitFor({timeout:120000});
  if(await page.getByTestId('record-reveal').count())break;
  const last=(await page.locator('body').innerText()).includes(`${i+1} of ${i+1}`);
  await page.getByTestId('option-0').click();
  if(last)break;
 }
 await page.getByTestId('record-reveal').waitFor({timeout:120000});
}

const owner=await open('owner');const {page}=owner;
try{
 // Onboarding: one optional tap, sent as an anonymous count.
 await page.goto(base,{timeout:300000});await page.getByTestId('heard-tiktok').waitFor();
 await page.getByTestId('heard-tiktok').click();
 await expect(page.getByTestId('heard-tiktok')).toHaveAttribute('aria-checked','true');
 await owner.shot('onboarding-heard-from');
 await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
 await expect.poll(()=>owner.engine.filter(r=>r.body.action==='heard').length).toBe(1);
 const heard=owner.engine.find(r=>r.body.action==='heard');
 expect(heard).toEqual({body:{action:'heard',source:'TikTok'},authorization:null});
 log.heard=heard;

 // First reveal: the notification offer first, then the soft Plus offer with price, period and cancellation.
 await read(page,'Will I finish my painting project this month?');
 await page.getByTestId('notify-not-now').click();
 const offer=page.getByTestId('plus-offer');await expect(offer).toBeVisible();
 await expect(offer).toContainText('3 days free, then $4.99 / week. Renews until canceled in your app store’s subscription settings.');
 await offer.scrollIntoViewIfNeeded();await owner.shot('soft-plus-offer');
 await expect.poll(async()=>(await stored(page)).plusOffered).toBe(true);
 await page.getByTestId('plus-offer-dismiss').click();await expect(offer).toHaveCount(0);

 // Forecast card and friend link: the web address, and a web (not crystalball://) link.
 await page.getByTestId('share-this-glimpse').click();
 log.forecastCard=await exportCard(page,'forecast-card');expect(log.forecastCard.file).toBe('crystal-ball-forecast.png');
 await page.getByTestId('share-friend-link').click();
 await expect.poll(()=>page.evaluate(()=>window.shared.length)).toBe(1);
 const friend=new URL((await page.evaluate(()=>window.shared[0])).url);
 expect(friend.origin).toBe(new URL(base).origin);expect(friend.searchParams.get('friend')).toBe('1');
 log.friendLink=friend.href;
 await page.getByTestId('close-flow').click();await page.getByTestId('close-flow').click();

 // Readings run out: the paywall still opens, at the launch prices, without the yearly plan.
 await read(page,'Will I travel somewhere new this year?').catch(()=>{});
 await expect(page.getByText('Choose your next chapter.')).toBeVisible();
 const plans=await page.locator('[role=radio]').allInnerTexts();
 expect(plans).toHaveLength(2);expect(plans[0]).toContain('$4.99 each week · $259.48/yr (52 weeks)');expect(plans[1]).toContain('$9.99 each month');
 await expect(page.getByText('Weekly starts with a 3-day free trial, then $4.99 / week.')).toBeVisible();
 await expect(page.getByText('$39.99')).toHaveCount(0);
 await owner.shot('paywall');log.plans=plans;
 await page.getByTestId('close-flow').click();

 // The soft offer is shown once: a reviewed reading never offers it again.
 await page.getByTestId('close-flow').click().catch(()=>{});await page.getByTestId('tab-history').click();
 await page.getByRole('button').filter({hasText:'painting project'}).first().click();
 await expect(page.getByTestId('record-reveal')).toBeVisible();await expect(page.getByTestId('plus-offer')).toHaveCount(0);
 await page.getByTestId('close-flow').click();

 // Daily omen card.
 await page.getByTestId('tab-home').click();
 await page.getByTestId('share-omen').waitFor({timeout:180000});
 const omen=await page.getByTestId('daily-omen').innerText();
 await page.evaluate(()=>window.storyText=[]);await page.getByTestId('share-omen').click();
 await expect(page.getByText('Share today’s omen',{exact:true})).toBeVisible();await owner.shot('omen-share');
 log.omenCard=await exportCard(page,'omen-card');expect(log.omenCard.file).toBe('crystal-ball-omen.png');
 expect(log.omenCard.text.some(t=>t.startsWith('Daily omen ·'))).toBe(true);
 expect(log.omenCard.text.join(' ')).not.toContain('Tonight');
 log.omen=omen;
 await page.getByTestId('close-flow').click();

 // Ball portrait card: the first insight, at 10 answers, is the portrait.
 await page.getByTestId('tab-you').click();await page.getByTestId('open-ball-asks').click();
 for(let i=0;i<10;i++){await page.getByTestId('ask-question').waitFor();const q=await page.getByTestId('ask-question').innerText();await page.getByTestId('ask-option-0').click();await expect(page.getByTestId('ask-question').filter({hasNotText:q}).or(page.getByTestId('ask-insight-forming')).or(page.getByTestId('ask-insight')).first()).toBeVisible();}
 await page.getByTestId('ask-insight').or(page.getByTestId('ask-insight-retry')).first().waitFor({timeout:180000});
 if(await page.getByTestId('ask-insight-retry').count()){log.insightRetried=true;await page.getByTestId('ask-insight-retry').click();await page.getByTestId('ask-insight').waitFor({timeout:180000})}
 const portrait=(await stored(page)).asks.insights[0];expect(portrait.kind).toBe('portrait');
 await page.evaluate(()=>window.storyText=[]);await page.getByTestId('ask-share-portrait').click();
 await expect(page.getByText('Share your portrait',{exact:true})).toBeVisible();await owner.shot('portrait-share');
 log.portraitCard=await exportCard(page,'portrait-card');expect(log.portraitCard.file).toBe('crystal-ball-portrait.png');
 const drawn=log.portraitCard.text.join(' ');
 for(const word of portrait.text.split(' '))expect(drawn).toContain(word);
 log.portrait=portrait;
 await page.getByTestId('close-flow').click();

 // Someone already reading here keeps their account when they open an invite.
 await page.goto(friend.href);await page.getByTestId('question-input').waitFor();
 expect(await page.evaluate(()=>localStorage.getItem('cb.web-visitor'))).toBeNull();

 // A new browser that follows the friend link gets one free web reading, then the install prompt.
 const visitor=await open('visitor');
 await visitor.page.goto(friend.href,{timeout:300000});
 await visitor.page.getByTestId('skip-for-now').click();await visitor.page.getByTestId('confirm-age').click();
 expect(await visitor.page.evaluate(()=>localStorage.getItem('cb.web-visitor'))).toBe('1');
 await expect(visitor.page.getByTestId('question-input')).toHaveValue(friend.searchParams.get('question'));
 await visitor.page.getByTestId('look-into-the-future').click();
 for(let i=0;i<3;i++){
  await visitor.page.getByTestId('option-0').or(visitor.page.getByTestId('record-reveal')).first().waitFor({timeout:180000});
  if(await visitor.page.getByTestId('record-reveal').count())break;
  await visitor.page.getByTestId('option-0').click();
 }
 await visitor.page.getByTestId('record-reveal').waitFor({timeout:180000});
 expect(visitor.engine.find(r=>r.body.action==='predict').body.webReading).toBeTruthy();
 await expect(visitor.page.getByTestId('ask-another-question')).toHaveCount(0);
 await expect(visitor.page.getByRole('button',{name:/Open Crystal Ball app|Install Crystal Ball/})).toBeVisible();
 await expect(visitor.page.getByTestId('plus-offer')).toHaveCount(0);
 await visitor.shot('invited-visitor-reveal');
 await visitor.context.close();

 // A Circle invite marks a new browser the same way.
 const invited=await open('circle');
 await invited.page.goto(`${base}/?circle=00000000-0000-4000-8000-000000000009`,{timeout:300000});
 await invited.page.getByTestId('skip-for-now').click();await invited.page.getByTestId('confirm-age').click();
 await expect.poll(()=>invited.page.evaluate(()=>localStorage.getItem('cb.web-visitor'))).toBe('1');
 await invited.context.close();

 expect(errors).toEqual([]);
 log.result='PASS';console.log('PASS',JSON.stringify(log));
}catch(error){log.result='FAIL';log.error=String(error);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error}
finally{log.errors=errors;await writeFile(`${out}/drive.json`,JSON.stringify(log,null,1));await browser.close()}
