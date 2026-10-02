import {chromium} from '@playwright/test';
const base=process.env.PREVIEW_URL||'http://localhost:8098';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
for(const key of ['mist','tarot','crystal']){
 await page.goto(base+'/concepts/index.html?capture='+key+'#'+key);await page.locator(`[data-pick=${key}]`).click();await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`docs/evidence/home-cards/concept-${key}.png`,fullPage:true});
 await page.addStyleTag({content:'.controls{visibility:hidden}'});
 for(let i=0;i<4;i++)await page.locator('.phone').nth(i).screenshot({path:`docs/evidence/home-cards/concept-${key}-${['home','history','paywall','ask'][i]}.png`});
 console.log(key,await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,selected:document.body.dataset.direction})));
}
await browser.close();
