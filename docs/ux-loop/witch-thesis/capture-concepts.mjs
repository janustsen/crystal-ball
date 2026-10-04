// Historical capture driver. Do not run while the inbox 020 browser-stop instruction is active.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098';
const out='docs/ux-loop/witch-thesis/screens';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const checks=[];
try{
for(const door of (process.env.DOORS||'abc'))for(const view of ['home','welcome','ask','history','sky','plans']){
 await page.goto(`${base}/concepts/witch-house.html?door=${door}&view=${view}`);
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('.stage img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode().catch(()=>{}))));
 const missing=await page.locator('.stage img').evaluateAll(imgs=>imgs.filter(i=>!i.naturalWidth).map(i=>i.src));
 await page.locator('.stage').screenshot({path:`${out}/${door}-${view}-390.png`});
 for(const width of [360,390,430])for(const large of [false,true]){
  await page.setViewportSize({width,height:width===430?932:844});
  await page.evaluate(large=>document.body.classList.toggle('text200',large),large);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  checks.push({door,view,width,text:large?'200%':'100%',missing,overflow});
 }
 await page.setViewportSize({width:390,height:844});
}
await page.goto(`${base}/concepts/witch-house.html?door=a&view=home`);
await page.getByRole('button',{name:'Wake the ball',exact:true}).click();await page.getByRole('textbox',{name:'Your question'}).fill('Where next?');await page.locator('.action').click();if(!await page.locator('.notice').innerText())throw Error('Question interaction failed');
await page.getByRole('button',{name:'History',exact:true}).first().click();await page.getByRole('button',{name:'Open A new beginning',exact:true}).click();await page.getByRole('button',{name:'Why?',exact:true}).click();
await page.getByRole('button',{name:'Plans',exact:true}).first().click();await page.locator('[data-plan=Monthly]').click();if(await page.locator('.action').innerText()!=='Choose monthly')throw Error('Plan selection failed');await page.locator('.action').click();if(!(await page.locator('.notice').innerText()).includes('no purchase'))throw Error('Purchase prototype boundary failed');
await writeFile(`${out}/checks.json`,JSON.stringify({checks,interaction:'passed',limits:'Browser prototype only; no engine, native, or production-flow claim'},null,2));
console.log(JSON.stringify({cases:checks.length,overflow:checks.filter(c=>c.overflow).length,missing:checks.filter(c=>c.missing.length).length,interaction:'passed'}));
}finally{await browser.close()}
