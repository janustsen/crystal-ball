import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const out='docs/ux-loop/expansion-50',browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.addInitScript(()=>localStorage.setItem('crystal-ball-v1',JSON.stringify({onboardingDone:true,ageConfirmed:true,facts:{},history:[],credits:0,plus:false,largeText:false,reduceMotion:true,usage:{day:new Date().toISOString().slice(0,10),count:0}})));
 await page.goto('http://localhost:8098');await page.getByTestId('tab-you').click();await page.getByTestId('view-plans').click();const paper=page.locator('[data-material=parchment]').first();await paper.scrollIntoViewIfNeeded();await page.waitForTimeout(500);
 const rect=await paper.boundingBox(),clip={x:Math.max(0,rect.x-16),y:Math.max(0,rect.y-16),width:Math.min(390-Math.max(0,rect.x-16),rect.width+32),height:Math.min(844-Math.max(0,rect.y-16),rect.height+48)};
 const before=await page.screenshot({path:`${out}/shadow-before.png`,clip});
 const style=await paper.evaluate(el=>{const css=getComputedStyle(el),initial={filter:css.filter,clipPath:css.clipPath};const wrapper=document.createElement('div');wrapper.style.filter=css.filter;el.parentElement.insertBefore(wrapper,el);wrapper.appendChild(el);el.style.filter='none';return initial});
 const afterRect=await paper.boundingBox(),after=await page.screenshot({path:`${out}/shadow-wrapper.png`,clip});
 const a=await sharp(before).removeAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(after).removeAlpha().raw().toBuffer();let changedOutside=0;
 for(let y=0;y<a.info.height;y++)for(let x=0;x<a.info.width;x++)if(y+clip.y>=rect.y+rect.height){const i=(y*a.info.width+x)*a.info.channels;if(Math.max(...[0,1,2].map(c=>Math.abs(a.data[i+c]-b[i+c])))>8)changedOutside++}
 await writeFile(`${out}/shadow.json`,JSON.stringify({existing:style,beforeRect:rect,afterRect,changedPixelsBelowPaper:changedOutside,boundary:'Isolated DOM-only composition experiment. Not a production change, accessibility pass or native proof.'},null,2));
}finally{await browser.close()}
