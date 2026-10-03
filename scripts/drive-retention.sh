#!/usr/bin/env bash
set -euo pipefail
# Run after a real reading has been created in this isolated browser session.
export CHROME_DEVTOOLS_AXI_SESSION="${CHROME_DEVTOOLS_AXI_SESSION:-cb-retention}"
chrome-devtools-axi run <<'JS'
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const close=async()=>{while(await page.eval(()=>!!document.querySelector('[data-testid="close-flow"]')))await page.click('[data-testid="close-flow"]')};
await close();
await page.click('[data-testid="tab-home"]');
await page.wait('[data-testid="daily-omen"]:not([aria-busy="true"])',65000);
const omen=await page.eval(()=>document.querySelector('[data-testid="daily-omen"]').textContent);
const credits=await page.eval(()=>document.querySelector('[data-testid="view-plans"]').textContent);
await close();await page.click('[data-testid="tab-history"]');
await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>/Came true|Took another path|◷ Waiting|Did it come true/.test(e.textContent)).click());
const due=await page.eval(()=>document.querySelector('[data-testid="forecast-due-date"]').textContent);
assert(/^Check back · \d{4}-\d{2}-\d{2}$/.test(due),'Check-back date missing');
await page.click('[data-testid="remind-me-to-check-back"]');
assert(await page.eval(()=>document.body.innerText.includes('No reminder scheduled in this browser')),'web fallback missing');
await page.click('[data-testid="dismiss-notice"]');
for(const [outcome,label] of [['no','Took another path'],['pending','◷ Waiting'],['yes','Came true']]){
 await page.click(`[data-testid="check-in-${outcome}"]`);
 await close();await page.click('[data-testid="tab-history"]');
 assert((await page.eval(()=>document.body.innerText)).includes(label),`History missing ${label}`);
 await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>/Came true|Took another path|◷ Waiting|Did it come true/.test(e.textContent)).click());
}
const bounds=await page.eval(()=>Array.from(document.querySelectorAll('[data-testid^="check-in-"]')).map(e=>({id:e.dataset.testid,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:innerWidth})));
assert(bounds.every(b=>b.left>=0&&b.right<=b.width),'check-in overflow');
console.log('check-in bounds',JSON.stringify(bounds));
await page.open(await page.eval(()=>location.href));
await page.wait('[data-testid="daily-omen"]:not([aria-busy="true"])',65000);
assert(await page.eval(()=>document.querySelector('[data-testid="daily-omen"]').textContent)===omen,'omen changed on reload');
assert(await page.eval(()=>document.querySelector('[data-testid="view-plans"]').textContent)===credits,'retention spent a credit');
await close();await page.click('[data-testid="tab-history"]');
assert(await page.eval(()=>document.body.innerText.includes('Came true')),'verdict lost on reload');
await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.includes('Came true')).click());
assert(await page.eval(()=>document.querySelector('[data-testid="forecast-due-date"]').textContent)===due,'Check-back date changed on reload');
assert(await page.eval(()=>document.querySelector('[data-testid="check-in-yes"]').textContent.includes('✓')),'selected verdict lost');
console.log('PASS: personal omen, unchanged credits, Due date, web reminder, all verdicts, reload persistence, control bounds');
JS
