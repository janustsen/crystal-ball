#!/usr/bin/env bash
set -euo pipefail
# Run after a real reading has been created in this isolated browser session.
export CHROME_DEVTOOLS_AXI_SESSION="${CHROME_DEVTOOLS_AXI_SESSION:-cb-retention}"
chrome-devtools-axi run <<'JS'
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const openReading=async()=>page.eval(()=>{const reading=JSON.parse(localStorage.getItem('crystal-ball-v1')).history.find(p=>!p.circleId);if(!reading)throw Error('Create a personal reading first');Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent.includes(reading.headline)).click()});
const close=async()=>{while(await page.eval(()=>!!document.querySelector('[data-testid="close-flow"]')))await page.click('[data-testid="close-flow"]')};
await close();
await page.click('[data-testid="tab-home"]');
await page.wait('[data-testid="daily-omen"]:not([aria-busy="true"])',65000);
const omen=await page.eval(()=>document.querySelector('[data-testid="daily-omen"]').textContent);
const credits=await page.eval(()=>document.querySelector('[data-testid="view-plans"]').textContent);
await close();await page.click('[data-testid="tab-history"]');
await openReading();
const due=await page.eval(()=>document.querySelector('[data-testid="forecast-due-date"]').textContent);
const expectedDate=await page.eval(()=>{const p=JSON.parse(localStorage.getItem('crystal-ball-v1')).history.find(p=>!p.circleId);const d=p.dueDate?new Date(p.dueDate+'T12:00:00'):new Date(p.createdAt);if(!p.dueDate)d.setDate(d.getDate()+30);return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})});
assert(due==='Suggested check-in · '+expectedDate,'Check-back date missing or incorrect');
await page.click('[data-testid="reading-more"]');
await page.click('[data-testid="remind-me-to-check-back"]');
assert(await page.eval(()=>document.body.innerText.includes('No reminder scheduled in this browser')),'web fallback missing');
await page.click('[data-testid="dismiss-notice"]');
for(const [outcome,label] of [['no','Not quite'],['pending','Not yet'],['yes','Yes']]){
 if(await page.eval(()=>!!document.querySelector('[data-testid="change-outcome"]')))await page.click('[data-testid="change-outcome"]');
 const before=await page.eval(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).history.find(p=>!p.circleId).outcome);
 await page.click(`[data-testid="check-in-${outcome}"]`);
 assert(await page.eval(()=>JSON.parse(localStorage.getItem('crystal-ball-v1')).history.find(p=>!p.circleId).outcome)===before,'Selection saved without confirmation');
 await page.click('[data-testid="save-outcome"]');
 await close();await page.click('[data-testid="tab-history"]');
 assert((await page.eval(()=>document.body.innerText)).includes(label),`History missing ${label}`);
 await openReading();
}
await page.click('[data-testid="change-outcome"]');
const bounds=await page.eval(()=>Array.from(document.querySelectorAll('[data-testid="outcome-options"] [role="radio"]')).map(e=>({id:e.dataset.testid,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:innerWidth})));
assert(bounds.length===3&&bounds.every(b=>b.left>=0&&b.right<=b.width),'check-in overflow');
console.log('check-in bounds',JSON.stringify(bounds));
await page.open(await page.eval(()=>location.href));
await page.wait('[data-testid="daily-omen"]:not([aria-busy="true"])',65000);
assert(await page.eval(()=>document.querySelector('[data-testid="daily-omen"]').textContent)===omen,'omen changed on reload');
assert(await page.eval(()=>document.querySelector('[data-testid="view-plans"]').textContent)===credits,'retention spent a credit');
await close();await page.click('[data-testid="tab-history"]');
assert(await page.eval(()=>Array.from(document.querySelectorAll('[role="button"]')).some(e=>e.textContent.includes(JSON.parse(localStorage.getItem('crystal-ball-v1')).history.find(p=>!p.circleId).headline)&&e.textContent.includes('Yes'))),'verdict lost on reload');
await openReading();
assert(await page.eval(()=>document.querySelector('[data-testid="forecast-due-date"]').textContent)===due,'Check-back date changed on reload');
assert(await page.eval(()=>document.querySelector('[data-testid="check-in-status"]').textContent==='Saved · Yes'),'saved verdict lost');
await page.click('[data-testid="change-outcome"]');
assert(await page.eval(()=>document.querySelector('[data-testid="check-in-yes"]').getAttribute('aria-checked')==='true'),'selected verdict lost');
console.log('PASS: personal omen, unchanged credits, Due date, web reminder, all verdicts, reload persistence, control bounds');
JS
