// Isolated Playwright driver for "Share my week" and December's "Your year in the Ball". History is a labeled localStorage
// fixture (recaps count saved readings; no model call is involved); Sunday and December are a browser clock set to that date. Plus is the
// simulated plan. Proves the label/counts export and its privacy, not predictive accuracy.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {httpCredentials} from './preview-auth.mjs';
import {allOpen} from './ladder-seed.mjs';
const base=process.env.VERIFY_URL||'http://localhost:8146',out=process.env.EVIDENCE_DIR||'docs/evidence/share-recaps';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const log={boundary:'History and whispers are a labeled localStorage fixture; Sunday and December are a browser clock set to that date; Plus is simulated.'},errors=[];
const local=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const secret=['Private love question','Private work question','A private headline will arrive.'];

async function open(now){
 const context=await browser.newContext({httpCredentials,viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 if(now)await page.clock.install({time:now});
 await page.addInitScript(()=>{
  window.storyText=[];
  const draw=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,...rest){window.storyText.push(text);return draw.call(this,text,...rest)};
 });
 await page.goto(base,{timeout:180000});await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();
 await expect(page.getByTestId('tap-to-ask')).toBeVisible();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')||'{}').ageConfirmed===true);
 const today=new Date(now??Date.now()),day=n=>{const d=new Date(today);d.setDate(d.getDate()-n);d.setHours(12,0,0,0);return d};
 const state=await page.evaluate(([days,whisperDay,secret])=>{
  const state=JSON.parse(localStorage.getItem('crystal-ball-v1')),reading=(id,question,createdAt,extra={})=>({id:`0000000a-abcd-4000-8000-00000000000${id}`,question,headline:secret[2],createdAt,label:'Speculative forecast',why:'Fixture',facts:{},sources:[],assumptions:[],friend:false,...extra});
  state.history=[reading(1,`${secret[0]}: will I find love?`,days[0],{golden:true}),reading(2,`${secret[0]}: will I meet someone?`,days[1],{outcome:'yes'}),reading(3,`${secret[1]}: will I get the job?`,days[2]),reading(4,`${secret[0]}: will love find me?`,days[3])];
  state.whispers=[{day:whisperDay,text:'By tonight, a message may arrive.',outcome:'yes',checkedInAt:whisperDay}];
  return state;
 },[[day(1),day(2),day(3),day(40)].map(d=>d.toISOString()),local(day(1)),secret]);
 // Seed before hydration so a pending Store write cannot overwrite the fixture. Every ladder feature is open.
 state.ladder=allOpen;
 await page.addInitScript(state=>localStorage.setItem('crystal-ball-v1',JSON.stringify(state)),state);
 await page.reload();
 return {page,context};
}
async function exportCard(page,name){
 const preview=page.getByRole('img',{name:'Your exported forecast card'});
 await expect(preview).toBeVisible({timeout:60000});
 expect(await preview.evaluate(img=>[img.naturalWidth,img.naturalHeight])).toEqual([1080,1920]);
 await page.waitForTimeout(800);await page.screenshot({path:`${out}/${name}-share.png`});
 await page.evaluate(()=>window.storyText=[]);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByTestId('export-story-card').click()]);
 await download.saveAs(`${out}/${name}.png`);
 const text=await page.evaluate(()=>window.storyText);
 for(const hidden of [...secret,'%','accuracy','score'])expect(text.join(' ')).not.toContain(hidden);
 return {file:download.suggestedFilename(),text};
}

try{
 // Week: History carries the recap (on a Sunday too). The year share stays closed outside December.
 const october=await open(new Date('2026-10-11T10:00:00'));let page=october.page;
 await expect(page.getByTestId('hero-orb')).toBeVisible();
 await page.getByTestId('tab-history').click();
 // Scroll only after the tab's slide-in settles; scrolling mid-slide shifts an overflow-hidden ancestor sideways.
 await page.waitForTimeout(1500);await page.getByTestId('week-recap').scrollIntoViewIfNeeded();
 await expect(page.getByTestId('week-recap-identity')).toHaveText('The Hopeful Romantic');
 await page.waitForTimeout(500);await page.screenshot({path:`${out}/week-recap.png`});
 await page.getByTestId('week-recap-share').click();
 await expect(page.getByText('Share my week',{exact:true})).toBeVisible();
 log.week=await exportCard(page,'week');
 expect(log.week.file).toBe('crystal-ball-week.png');
 for(const line of ['The Hopeful Romantic','Your week in the Ball','3 readings · 1 golden find · 1 whisper landed','Most on your mind: Love','Oct 5 – Oct 11'])expect(log.week.text).toContain(line);
 await page.getByText('Back to your week',{exact:true}).click();
 await expect(page.getByTestId('week-recap')).toBeVisible();
 await page.getByTestId('year-recap-plus').click();await page.getByTestId('continue-with-plus-simulate').click();await page.getByTestId('close-flow').click();
 await page.getByTestId('tab-history').click();
 await expect(page.getByTestId('year-recap-2026')).toContainText('4 readings');
 await expect(page.getByTestId('year-recap-share')).toHaveCount(0);
 await october.context.close();

 // December: Plus shares the current year.
 const december=await open(new Date('2026-12-10T10:00:00'));page=december.page;
 await page.getByTestId('tab-history').click();
 await page.getByTestId('year-recap-plus').click();await page.getByTestId('continue-with-plus-simulate').click();await page.getByTestId('close-flow').click();
 await page.getByTestId('tab-history').click();
 await page.waitForTimeout(1500);const year=page.getByTestId('year-recap-2026');await year.scrollIntoViewIfNeeded();
 await expect(year).toContainText('The Hopeful Romantic');
 await page.waitForTimeout(500);await page.screenshot({path:`${out}/year-recap.png`});
 await page.getByTestId('year-recap-share').click();
 await expect(page.getByText('Share my year',{exact:true})).toBeVisible();
 log.year=await exportCard(page,'year');
 expect(log.year.file).toBe('crystal-ball-2026.png');
 for(const line of ['The Hopeful Romantic','Your 2026 in the Ball','4 readings · 1 golden find · 1 Yes check-in','Most asked: Love'])expect(log.year.text).toContain(line);
 await december.context.close();
 expect(errors).toEqual([]);
 log.result='PASS';console.log('PASS',JSON.stringify(log));
}catch(error){log.result='FAIL';log.error=String(error);throw error}
finally{log.errors=errors;await writeFile(`${out}/drive.json`,JSON.stringify(log,null,1));await browser.close()}
