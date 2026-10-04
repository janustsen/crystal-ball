// A stored value is not proof that its glyphs paint above decorative artwork.
import {chromium,expect} from '@playwright/test';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {fillBirthday} from './fill-birthday.mjs';
const out=process.env.UX_EVIDENCE||'.local/input-ink';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
async function ink(page,field,name){
 await field.scrollIntoViewIfNeeded();await expect(field).not.toHaveValue('');
 const normal=await field.screenshot({caret:'hide',path:`${out}/${name}-ink.png`});
 const style=await field.getAttribute('style');let hidden;
 try{await field.evaluate(el=>el.style.setProperty('color','transparent','important'));hidden=await field.screenshot({caret:'hide',path:`${out}/${name}-no-ink.png`})}finally{await field.evaluate((el,style)=>style===null?el.removeAttribute('style'):el.setAttribute('style',style),style)}
 const a=await sharp(normal).ensureAlpha().raw().toBuffer(),b=await sharp(hidden).ensureAlpha().raw().toBuffer();expect(a.length).toBe(b.length);
 let painted=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>12)painted++;
 checks.push({name,paintedInkPixels:painted});expect(painted,`${name}: hiding entered text must visibly change its rendered pixels`).toBeGreaterThan(40);
}
try{for(const largeText of [false,true]){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(largeText=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[],credits:3,largeText,reduceMotion:true})),largeText);
 const page=await context.newPage(),scale=largeText?200:100;
 await page.route('**/engine',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({kind:'error',message:'Ink test only; no generation.'})}));
 await page.goto(process.env.PREVIEW_URL||'http://localhost:8098');await fillBirthday(page,'1995-06-15');
 for(const part of ['day','month','year'])await ink(page,page.getByRole('textbox',{name:`Birthday ${part}`,exact:true}),`birthday-${part}-${scale}`);
 await page.getByTestId('continue').click();await page.getByTestId('meet-the-ball').click();await page.getByTestId('hero-orb').click();await page.getByTestId('type-instead').click();
 await page.getByTestId('question-input').fill('Will I find time for pottery this winter?');await ink(page,page.getByTestId('question-input'),`question-${scale}`);
 await page.getByTestId('question-input-expand').click();await page.getByTestId('expanded-input').fill('A quiet evening to practise. '.repeat(10));await ink(page,page.getByTestId('expanded-input'),`expanded-${scale}`);await page.getByTestId('editor-cancel').click();
 await page.getByTestId('question-subject').click();await page.getByTestId('ask-about-someone').click();await page.getByTestId('person-name').fill('Alex');await ink(page,page.getByTestId('person-name'),`person-${scale}`);await page.getByTestId('save-subject').click();await page.getByTestId('close-flow').click();
 await page.getByTestId('tab-you').click();await page.getByTestId('add-birth-time-and-place').click();await page.getByTestId('birth-time').fill('14:30');await ink(page,page.getByTestId('birth-time'),`time-${scale}`);await page.getByTestId('continue-to-birth-city').click();await page.getByTestId('birth-place').fill('Copenhagen');await ink(page,page.getByTestId('birth-place'),`city-${scale}`);
 await context.close();
}}finally{await browser.close();await writeFile(`${out}/ink.json`,JSON.stringify(checks,null,2))}
console.log('Visible ink verified in every shared field family at both text scales.');
