import {assertSafe} from './hooks.mjs';

export async function assertHomeSafe(page){
 // Home shows the omen as one insight line until it is opened: check the whole of today's omen it summarizes.
 if(await page.getByTestId('insight-line').count()){
  const text=await (await page.waitForFunction(()=>{const omen=JSON.parse(localStorage.getItem('crystal-ball-personal-omen-v1')??'{}');return omen.day===new Date().toLocaleDateString('en-CA')&&omen.text!=null&&omen.text},null,{timeout:90000})).jsonValue();
  assertSafe(text);return;
 }
 const panel=page.getByTestId('daily-omen');
 await panel.locator('[aria-live="polite"]').waitFor();
 await page.waitForFunction(()=>{
  const omen=JSON.parse(localStorage.getItem('crystal-ball-personal-omen-v1')??'{}'); // omenKey in src/daily-omen.ts
  return omen.day===new Date().toLocaleDateString('en-CA')&&omen.text!=null&&document.querySelector('[data-testid="daily-omen"] [aria-live="polite"]')?.textContent===omen.text;
 },null,{timeout:90000});
 assertSafe(await panel.locator('[aria-live="polite"]').innerText());
}

export async function assertFollowUpSafe(page){
 const options=page.getByRole('radiogroup');
 assertSafe(await options.evaluate(el=>el.previousElementSibling.textContent));
 for(const text of await options.getByRole('radio').allTextContents())assertSafe(text.replace(/^✧\s*/,''));
}
