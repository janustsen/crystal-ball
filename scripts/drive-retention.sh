#!/usr/bin/env bash
set -euo pipefail
# Run after a real reading has been created in this isolated browser session.
export CHROME_DEVTOOLS_AXI_SESSION="${CHROME_DEVTOOLS_AXI_SESSION:-cb-retention}"
chrome-devtools-axi run <<'JS'
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
await page.click('[data-testid="tab-home"]');
const omen=await page.eval(()=>document.querySelector('[data-testid="daily-omen"]').textContent);
const credits=await page.eval(()=>document.querySelector('[data-testid="view-plans"]').textContent);
await page.click('[data-testid="tab-history"]');
await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>/Came true|Took another path|Waiting to unfold|Did it come true/.test(e.textContent)).click());
await page.fill('[data-testid="check-in-date"]','2026-02-30');
await page.click('[data-testid="remind-me-to-check-back"]');
assert(await page.eval(()=>document.body.innerText.includes('Choose a future check-in date')),'invalid date accepted');
await page.click('[data-testid="dismiss-notice"]');
const future=new Date();future.setFullYear(future.getFullYear()+1);
const date=`${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}-${String(future.getDate()).padStart(2,'0')}`;
await page.fill('[data-testid="check-in-date"]',date);await page.click('[data-testid="remind-me-to-check-back"]');
assert(await page.eval(()=>document.body.innerText.includes('Native reminder preview')),'web fallback missing');
await page.click('[data-testid="dismiss-notice"]');
for(const [outcome,label] of [['no','Took another path'],['pending','Waiting to unfold'],['yes','Came true']]){
 await page.click(`[data-testid="check-in-${outcome}"]`);
 await page.click('[data-testid="tab-history"]');
 assert((await page.eval(()=>document.body.innerText)).includes(label),`History missing ${label}`);
 await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>/Came true|Took another path|Waiting to unfold|Did it come true/.test(e.textContent)).click());
}
const bounds=await page.eval(()=>Array.from(document.querySelectorAll('[data-testid^="check-in-"]')).map(e=>({id:e.dataset.testid,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:innerWidth})));
assert(bounds.every(b=>b.left>=0&&b.right<=b.width),'check-in overflow');
console.log('check-in bounds',JSON.stringify(bounds));
await page.open(await page.eval(()=>location.href));
await page.wait('[data-testid="daily-omen"]');
assert(await page.eval(()=>document.querySelector('[data-testid="daily-omen"]').textContent)===omen,'omen changed on reload');
assert(await page.eval(()=>document.querySelector('[data-testid="view-plans"]').textContent)===credits,'retention spent a credit');
await page.click('[data-testid="tab-history"]');
assert(await page.eval(()=>document.body.innerText.includes('Came true')),'verdict lost on reload');
await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.includes('Came true')).click());
assert(await page.eval(()=>document.querySelector('[data-testid="check-in-date"]').value)===date,'date lost on reload');
assert(await page.eval(()=>document.querySelector('[data-testid="check-in-yes"]').textContent.includes('✓')),'selected verdict lost');
console.log('PASS: omen, unchanged credits, invalid date, web reminder, all verdicts, reload persistence, control bounds');
JS
