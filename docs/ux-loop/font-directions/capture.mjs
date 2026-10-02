import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{for(const pair of ['a','b','c'])for(const screen of ['home','reveal','history','plans'])for(const large of [0,1]){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://localhost:8098/concepts/fonts.html?capture=1&pair=${pair}&screen=${screen}&large=${large}`);await page.locator('.chosen .phone').waitFor();await page.evaluate(()=>document.fonts.ready);
 const fonts=await page.evaluate(()=>[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family));expect(fonts.length).toBeGreaterThanOrEqual(2);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`docs/ux-loop/font-directions/screens/${pair}-${screen}-${large?200:100}.png`});checks.push({pair,screen,large,fonts,errors});await page.close();
}const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto('http://localhost:8098/concepts/fonts.html');await page.getByRole('button',{name:'A · Moonlit editorial'}).click();await expect(page.getByRole('button',{name:'A · Moonlit editorial'})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'200% text'}).click();await expect(page.getByRole('button',{name:'200% text'})).toHaveAttribute('aria-pressed','true');await page.getByRole('combobox').selectOption('plans');await page.screenshot({path:'docs/ux-loop/font-directions/screens/switcher-plans.png'});
}finally{await browser.close();await writeFile('docs/ux-loop/font-directions/checks.json',JSON.stringify(checks,null,2));}console.log(`${checks.length} font compositions, loaded fonts, switcher and overflow verified.`);
