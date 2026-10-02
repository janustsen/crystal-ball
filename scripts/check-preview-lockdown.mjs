import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {previewFetch,previewSecret} from './preview-auth.mjs';
const base=process.env.PREVIEW_URL||'http://localhost:8087';
for(const path of ['/engine','/engine/social']){
 assert.equal((await fetch(base+path,{method:'POST',body:'{}'})).status,401);
 assert.equal((await fetch(base+path,{method:'POST',headers:{origin:base},body:'{}'})).status,401);
 assert.equal((await fetch(base+path,{method:'POST',headers:{'x-preview-token':previewSecret},body:'{}'})).status,401);
}
const removed=await previewFetch(base+'/engine/share',{method:'POST',body:'{}'});assert.ok(!removed.headers.get('content-type')?.includes('application/json'));
const shell=await fetch(base+'/').then(r=>r.text());assert.ok(!shell.includes(previewSecret));
// Owner-approved login removal: the bundle is public; engine guards still apply.
const bundle=await fetch(base+'/node_modules/expo-router/entry.bundle?platform=web');
assert.equal(bundle.status,200);assert.equal(bundle.headers.get('www-authenticate'),null);
assert.equal((await fetch(base+'/engine/health',{headers:{'x-preview-token':previewSecret}})).status,401);
assert.equal((await previewFetch(base+'/engine/health').then(r=>r.json())).provider,'ollama');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:false});
try{
 const page=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844}});page.setDefaultTimeout(15000);
 await page.addInitScript(()=>{const uniform=WebGLRenderingContext.prototype.uniform4f;WebGLRenderingContext.prototype.uniform4f=function(location,...values){window.lastMood=values;return uniform.call(this,location,...values)};window.rafCalls=0;const raf=window.requestAnimationFrame;window.requestAnimationFrame=cb=>raf.call(window,t=>{window.rafCalls++;cb(t)})});
 await page.goto(base);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('tab-you').waitFor();
 async function callbacks(label,paused){await page.waitForTimeout(600);const before=await page.evaluate(()=>window.rafCalls);await page.waitForTimeout(600);const count=await page.evaluate(()=>window.rafCalls)-before;if(paused)expect(count,label).toBe(0);else expect(count,label).toBeGreaterThan(10);console.log(label,count,'callbacks / 600ms')}
 await callbacks('OS reduced motion',true);
 await page.emulateMedia({reducedMotion:'no-preference'});await callbacks('OS motion resumed',false);
 await page.getByTestId('tab-you').click();await page.getByRole('switch',{name:'Reduce motion',exact:true}).click();await callbacks('App reduced motion',true);
 await page.getByRole('switch',{name:'Reduce motion',exact:true}).click();await callbacks('App motion resumed',false);
 // Inject the visibility boundary; do not depend on window-manager focus in automation.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await callbacks('Hidden page',true);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});await callbacks('Visible page resumed',false);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByTestId('tab-ask').click();await page.getByTestId('speak-question').click();await page.getByTestId('type-instead').waitFor();await expect.poll(()=>page.evaluate(()=>window.lastMood)).toEqual([2.2,.3,.6,1]);await callbacks('Reduced listening mood',true);await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill('Will I be conversational in Spanish in six months?');await page.getByTestId('look-into-the-future').click();
 await page.getByTestId('option-0').waitFor({timeout:65000});await expect.poll(()=>page.evaluate(()=>window.lastMood)).toEqual([1.1,.25,.5,1]);
 let predictions=0;await page.route('**/engine',async route=>{if(route.request().postDataJSON()?.action==='predict'){predictions++;await route.abort()}else await route.continue()});
 const total=Number((await page.getByText(/^1 of [12]$/).innerText()).split(' of ')[1]);
 for(let index=1;index<total;index++){await page.getByTestId('option-0').click();await page.getByTestId('answer-next').click();await expect(page.getByText(`${index+1} of ${total}`,{exact:true})).toBeVisible()}
 await page.getByTestId('option-0').click();await page.getByTestId('answer-next').evaluate(node=>{node.click();node.click()});await page.getByRole('button',{name:'Try again',exact:true}).waitFor();expect(predictions).toBe(1);
 await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByRole('button',{name:'Try again',exact:true}).waitFor();expect(predictions).toBe(2);
 console.log('PASS: login-free app, guarded bridge, paused callbacks, single final submit, and retry after failure.');
}finally{await browser.close()}
