import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {assertFollowUpSafe,assertHomeSafe} from '../scripts/content/capture-safety.mjs';

test('capture checks reject unsafe displayed omens and every follow-up field',async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage();
  const unsafe='Gemini, the ball is always right about your future.';
  const safe='Gemini, a small step opens a gentle path today.';
  await page.setContent('<div data-testid="daily-omen" aria-busy="false"><div>Today’s omen · free</div><div aria-live="polite"></div></div>');
  const omen=page.locator('[aria-live="polite"]');
  await omen.evaluate((el,text)=>{el.textContent=text},unsafe);
  await assert.rejects(assertHomeSafe(page),/Content rule/);
  await omen.evaluate((el,text)=>{el.textContent=text},safe);
  await assertHomeSafe(page);
  await page.getByTestId('daily-omen').evaluate(el=>{el.setAttribute('aria-busy','true')});
  let settled=false;
  const refreshed=assertHomeSafe(page).finally(()=>{settled=true});
  const rejected=assert.rejects(refreshed,/Content rule/);
  await page.waitForTimeout(100);
  assert.equal(settled,false);
  await omen.evaluate((el,text)=>{el.textContent=text;el.parentElement!.setAttribute('aria-busy','false')},unsafe);
  await rejected;

  await page.setContent('<div><div id="question">How long have you been waiting?</div><div role="radiogroup"><button role="radio">A few days</button><button role="radio">A few weeks</button><button role="radio">✧ In my own words</button></div></div>');
  await assertFollowUpSafe(page);
  for(const field of [page.locator('#question'),...await page.getByRole('radio').all()]){
   const original=await field.textContent();
   await field.evaluate((el,text)=>{el.textContent=text},unsafe);
   await assert.rejects(assertFollowUpSafe(page),/Content rule/);
   await field.evaluate((el,text)=>{el.textContent=text},original);
  }
  await assertFollowUpSafe(page);
 }finally{await browser.close()}
});
