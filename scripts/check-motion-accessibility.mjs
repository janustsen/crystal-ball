import {httpCredentials} from './preview-auth.mjs';
import {chromium,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:false});
const page=await browser.newPage({httpCredentials,viewport:{width:390,height:844},reducedMotion:'reduce'}),log=[];
await page.addInitScript(()=>{window.drawCount=0;const original=WebGLRenderingContext.prototype.drawArrays;WebGLRenderingContext.prototype.drawArrays=function(...args){window.drawCount++;return original.apply(this,args)}});
async function still(label){await page.waitForTimeout(300);const before=await page.evaluate(()=>window.drawCount);await page.waitForTimeout(500);const after=await page.evaluate(()=>({draws:window.drawCount,animations:document.getAnimations().filter(a=>a.playState==='running').length,reduced:document.querySelector('[data-testid=app-shell]').getAttribute('data-reduced')}));expect(after.draws).toBe(before);expect(after.animations).toBe(0);expect(after.reduced).toBe('true');log.push({label,...after})}
try{
 await page.goto(process.env.PREVIEW_URL||'http://localhost:8087');await page.getByTestId('tab-you').waitFor();await still('OS reduced motion');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(300);const n=await page.evaluate(()=>window.drawCount);await expect.poll(()=>page.evaluate(()=>window.drawCount)).toBeGreaterThan(n);log.push({label:'motion resumes with OS preference'});
 await page.getByTestId('tab-you').click();await page.getByRole('switch',{name:'Reduce motion',exact:true}).click();await still('in-app reduced motion');
 await page.getByRole('switch',{name:'Large text',exact:true}).click();await page.getByTestId('tab-home').click();await still('large text reduced motion');
 const balls=await page.locator('.orb .gb').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,visible:n.getBoundingClientRect().bottom<=innerHeight})));expect(balls).toHaveLength(2);expect(balls.every(b=>b.visible)).toBe(true);log.push({balls});
 await page.getByTestId('hero-orb').click();await expect(page.getByTestId('type-instead')).toBeVisible({timeout:1000});log.push({label:'approach delay skipped'});
 await mkdir('docs/evidence/motion-2026-09-30',{recursive:true});await writeFile('docs/evidence/motion-2026-09-30/reduced-motion.json',JSON.stringify(log,null,2)+'\n');
 console.log('Reduced motion, resume, large text and immediate listening passed.');
}finally{await browser.close()}
