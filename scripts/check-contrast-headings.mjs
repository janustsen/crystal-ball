// A text range can include neighboring glyphs below its baseline. Hide those too.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {measureTextContrast} from './measure-text-contrast.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<style>body{background:#111;color:#fff}*{margin:0;font:32px Arial}h1{position:absolute;top:35px}button{position:absolute;top:10px;color:white;background:transparent;border:0;line-height:60px}</style><h1>Behind the mist</h1><button>Close</button>');
 const samples=await measureTextContrast(page);
 assert(samples.some(row=>row.text==='Behind the mist'),'Heading must be sampled');
 assert(samples.every(row=>row.contrast>=row.required),JSON.stringify(samples));
 assert.equal(await page.locator('h1').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)','Foreground restored');
 console.log('Heading collected, neighboring text hidden, original styles restored');
} finally {await browser.close()}
