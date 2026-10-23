// Hold a real request pending to inspect the entire wait; no successful forecast is fabricated.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8087',out=process.env.EVIDENCE_DIR||'.local/thinking-mist';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),results=[];
const releases=[];
try{
 await page.goto(base);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();
 await page.route(`${base}/engine`,async route=>{await new Promise(resolve=>{releases.push(resolve)});await route.abort().catch(()=>{})});
 for(const reduced of [false,true]){
  if(reduced){await page.getByTestId('open-settings').click();await page.getByRole('switch',{name:'Reduce motion',exact:true}).click();await page.getByTestId('header-back').click()}
  await page.getByTestId('tap-to-ask').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill('Will I finish my painting this month?');const started=Date.now();await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').waitFor();const firstCardMs=Date.now()-started;expect(firstCardMs).toBeLessThan(1000);await page.getByTestId('option-0').click();
  const mist=page.getByTestId('thinking-mist'),drift=page.getByTestId('thinking-mist-drift');await expect(mist).toBeVisible();await page.waitForTimeout(1800);
  const first=await drift.evaluate(e=>getComputedStyle(e).transform);await page.screenshot({path:`${out}/${reduced?'reduced':'moving'}-before.png`});
  await page.waitForTimeout(900);const second=await drift.evaluate(e=>getComputedStyle(e).transform);await page.screenshot({path:`${out}/${reduced?'reduced':'moving'}-after.png`});
  if(reduced)expect(second).toBe(first);else expect(second).not.toBe(first);
  expect(await mist.getAttribute('aria-hidden')).toBe('true');
  await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeInViewport();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(mist).toHaveCount(0);await expect(page.getByTestId('tap-to-ask')).toBeVisible();releases.splice(0).forEach(resolve=>resolve());
  results.push({reduced,firstCardMs,first,second,cancel:true});
 }
 console.log('PASS: first card appears in under 1 second without waiting for planning; loading light moves throughout the wait, reduced motion stays still, Cancel remains reachable and removes the animation.');
}finally{releases.splice(0).forEach(resolve=>resolve());await writeFile(`${out}/result.json`,JSON.stringify(results,null,2));await browser.close()}
