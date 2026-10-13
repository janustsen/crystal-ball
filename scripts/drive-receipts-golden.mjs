// Isolated Playwright driver for Yes receipts and the golden shelf. Real Ollama reading; golden shelf entries are an explicit
// persisted-reading fixture because a real golden draw is 1 in 50. Proves behaviour and export shape, not predictive accuracy.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {httpCredentials,previewFetch} from './preview-auth.mjs';
const base=process.env.VERIFY_URL||'http://localhost:8123',out=process.env.EVIDENCE_DIR||'docs/evidence/receipts-golden';
await mkdir(out,{recursive:true});
const health=await previewFetch(`${base}/engine/health`).then(r=>r.json());
expect(health).toMatchObject({app:'crystal-ball',provider:'ollama'});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({httpCredentials,viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
const page=await context.newPage();page.setDefaultTimeout(30000);
await page.addInitScript(()=>{
 window.storyText=[];
 const draw=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){window.storyText.push({text,x,y,font:this.font,width:this.measureText(text).width});return draw.call(this,text,x,y,...rest)};
});
const log={health,boundary:'Real Ollama reading for the receipt; golden shelf readings are a labeled localStorage fixture.'},errors=[],replies=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',async r=>{if(r.url()===`${base}/engine`&&r.request().method()==='POST')try{replies.push(await r.json())}catch{}});
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')));
async function exportCard(name){
 const preview=page.getByRole('img',{name:'Your exported forecast card'});
 await expect(preview).toBeVisible({timeout:60000});
 const size=await preview.evaluate(img=>[img.naturalWidth,img.naturalHeight]);expect(size).toEqual([1080,1920]);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByTestId('export-story-card').click()]);
 await download.saveAs(`${out}/${name}.png`);return download.suggestedFilename();
}
try{
 await page.goto(base,{timeout:180000});await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
 const question='Will I finish my painting project this month?';
 await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();
 await page.getByTestId('question-input').fill(question);await page.getByTestId('look-into-the-future').click();
 for(let i=0;i<3;i++){
  await page.getByTestId('option-0').waitFor({timeout:65000});
  const last=(await page.locator('body').innerText()).includes(`${i+1} of ${i+1}`);
  await page.getByRole('radio',{name:'✧ In my own words'}).click();await page.getByTestId('other-input').fill('I paint every weekend and have finished two of three pieces.');await page.getByTestId('answer-next').click();
  if(last)break;
 }
 await page.getByTestId('record-reveal').waitFor({timeout:65000});
 // The server, not the device, decides the edition: the forecast reply carries it and the saved reading keeps it.
 const forecast=replies.find(r=>r.kind==='ok'&&r.value?.headline);
 expect(typeof forecast.value.golden).toBe('boolean');
 const reading=(await stored()).history[0];expect(reading.golden).toBe(forecast.value.golden);
 log.forecast={headline:reading.headline,golden:reading.golden};
 await page.getByTestId('close-flow').click();await page.getByTestId('tab-history').click();
 if(!reading.golden)await expect(page.getByTestId('golden-shelf')).toHaveCount(0);
 await page.getByRole('button').filter({hasText:question}).click();
 for(const id of ['no','pending']){
  await page.getByTestId(`check-in-${id}`).click();await page.getByTestId('dismiss-notice').click();
  await expect(page.getByTestId('share-receipt')).toHaveCount(0);
 }
 await page.getByTestId('check-in-yes').click();await page.getByTestId('dismiss-notice').click();
 const today=await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`});
 expect((await stored()).history[0]).toMatchObject({outcome:'yes',checkedInAt:today});
 await page.getByTestId('share-receipt').click();
 await expect(page.getByText('Share your receipt',{exact:true})).toBeVisible();
 await expect(page.getByTestId('share-record-reveal')).toHaveCount(0);
 await page.waitForTimeout(1500);await page.screenshot({path:`${out}/receipt-share.png`});
 log.receiptFile=await exportCard('receipt');expect(log.receiptFile).toBe('crystal-ball-receipt.png');
 const receiptText=await page.evaluate(()=>window.storyText.map(t=>t.text).join(' '));
 expect(receiptText).not.toContain('Speculative forecast');expect(receiptText).not.toContain('Not a guarantee');expect(receiptText).toContain('opened');expect(receiptText).not.toContain(question);
 await page.getByTestId('close-flow').click();
 // Switching away from Yes withdraws the receipt.
 await page.getByTestId('check-in-no').click();await page.getByTestId('dismiss-notice').click();
 await expect(page.getByTestId('share-receipt')).toHaveCount(0);
 await page.getByTestId('close-flow').click();

 await page.evaluate(()=>{
  const state=JSON.parse(localStorage.getItem('crystal-ball-v1')),base={label:'Speculative forecast · not a guarantee',why:'Fixture',facts:{},sources:[],assumptions:[],friend:false};
  state.history.push({...base,id:'0000000a-abcd-4000-8000-000000000001',question:'Will I finish my draft?',headline:'You will finish your first draft within 6 months.',createdAt:'2026-09-30T12:00:00Z',golden:true},
   {...base,id:'0000000a-abcd-4000-8000-000000000002',question:'Will I run a marathon?',headline:'You will cross a finish line before spring.',createdAt:'2026-09-20T12:00:00Z',golden:true});
  state.history.push(...[3,4].map(n=>({...base,id:`0000000a-abcd-4000-8000-00000000000${n}`,question:'Private golden question',headline:'You will finish your first draft within 6 months.',createdAt:'2026-09-10T12:00:00Z',golden:true})));
  state.history.filter(p=>p.golden).forEach(p=>p.headline='You will finish your first draft within 6 months.');
  state.history[0].outcome='yes';delete state.history[0].checkedInAt;state.history[0].dueDate='2099-12-31';
  localStorage.setItem('crystal-ball-v1',JSON.stringify(state));
 });
 await page.reload();await page.getByTestId('tab-history').click();
 const shelf=page.getByTestId('golden-shelf');await expect(shelf).toBeVisible();
 const expected=reading.golden?5:4;
 await expect(shelf.getByRole('button',{name:/^Golden forecast:/})).toHaveCount(expected);
 if(!reading.golden)await expect(shelf.getByText(reading.headline,{exact:true})).toHaveCount(0);
 await expect(shelf.getByText(`Golden shelf · ${expected}`)).toBeVisible();
 await page.waitForTimeout(1500);await page.screenshot({path:`${out}/history-shelf.png`});
 await page.evaluate(()=>window.storyText=[]);await page.getByTestId('share-golden-set').click();
 await expect(page.getByText('Share your golden set',{exact:true})).toBeVisible();
 await page.waitForTimeout(1500);await page.screenshot({path:`${out}/golden-set-share.png`});
 log.goldenSetFile=await exportCard('golden-set');expect(log.goldenSetFile).toBe('crystal-ball-golden-set.png');
 log.goldenDraw=await page.evaluate(()=>window.storyText);
 const headlineDraw=log.goldenDraw.filter(t=>t.font.includes('Georgia')&&t.text!=='Crystal Ball');
 expect(Math.max(...headlineDraw.map(t=>t.y))).toBeLessThanOrEqual(1270);
 expect(log.goldenDraw.some(t=>t.text===`${expected} golden forecasts`)).toBe(true);
 expect(log.goldenDraw.some(t=>t.text===`+${expected-3} more on the golden shelf`)).toBe(true);
 await page.getByTestId('close-flow').click();
 await page.getByRole('button').filter({hasText:question}).click();await page.evaluate(()=>window.storyText=[]);await page.getByTestId('share-receipt').click();
 await exportCard('legacy-receipt');
 const legacyText=await page.evaluate(()=>window.storyText.map(t=>t.text).join(' '));
 expect(legacyText).not.toContain('opened');expect(legacyText).not.toContain('2099');expect(legacyText).not.toContain('Speculative forecast');expect(legacyText).not.toContain('Not a guarantee');
 log.legacyReceipt=legacyText;
 await page.getByTestId('close-flow').click();await page.getByTestId('close-flow').click();await page.getByTestId('tab-history').click();
 await page.getByTestId('golden-shelf-item-0000000a-abcd-4000-8000-000000000001').click();
 await expect(page.getByTestId('golden-label')).toBeVisible();
 expect(errors).toEqual([]);
 log.result='PASS';console.log('PASS',JSON.stringify(log));
}catch(error){log.result='FAIL';log.error=String(error);await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});throw error}
finally{log.errors=errors;await writeFile(`${out}/drive.json`,JSON.stringify(log,null,1));await browser.close()}
