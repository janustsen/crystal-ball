import {chromium,expect} from '@playwright/test';import {measureTextOverflow} from './measure-text-overflow.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();try{
await page.setContent('<div id="fixture" style="width:9ch;font:20px monospace;white-space:pre-wrap;overflow-wrap:break-word">123456789 x</div>');
expect(await page.evaluate(measureTextOverflow,'#fixture')).toEqual([]);
await page.locator('#fixture').evaluate(el=>{el.style.whiteSpace='nowrap';el.textContent='123456789x'});
expect((await page.evaluate(measureTextOverflow,'#fixture')).some(x=>x.includes('123456789x'))).toBe(true);
await page.locator('#fixture').evaluate(el=>{el.style.whiteSpace='pre-wrap';el.textContent='12345678901234567890'});
expect(await page.evaluate(measureTextOverflow,'#fixture')).toEqual([]);
console.log('PASS: hanging whitespace allowed; overflowing visible text detected; wrapped words retained.');
}finally{await browser.close()}
