// Exercise real link navigation; external landing pages are controlled fixtures.
import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const prediction=JSON.parse(await readFile('docs/ux-loop/expansion-16/fixture.json','utf8'));
const out=process.env.UX_EVIDENCE||'.local/source-links';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{for(const largeText of [false,true]){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({prediction,largeText})=>localStorage.setItem('crystal-ball-v1',JSON.stringify({facts:{},history:[prediction],credits:0,plus:true,onboardingDone:true,ageConfirmed:true,ageBand:'adult',largeText,reduceMotion:true})),{prediction,largeText});
 await context.route('https://example.com/layout-source-*',route=>route.fulfill({contentType:'text/html',body:'<title>Controlled source destination</title><p>External landing-page fixture.</p>'}));
 const page=await context.newPage();await page.goto(process.env.PREVIEW_URL||'http://localhost:8098');await page.getByTestId('tab-history').click();await page.getByRole('button').filter({hasText:prediction.headline}).click();await page.getByTestId('why-disclosure').click();await page.getByTestId('open-why-sources').click();
 for(const [index,source] of prediction.sources.entries()){
  const link=page.getByRole('link').nth(index);const opened=page.waitForEvent('popup');await link.click();const popup=await opened;await popup.waitForLoadState();expect(popup.url()).toBe(source.url);await expect(popup.getByText('External landing-page fixture.')).toBeVisible();await popup.close();await page.bringToFront();await expect(page.getByTestId('why-sources')).toBeVisible();await expect(link).toBeFocused();checks.push({largeText,url:source.url,intendedDestination:true,readerPreserved:true,linkFocusRestored:true,externalContent:'controlled fixture; not a source-availability or credibility claim'});
 }
 await page.screenshot({path:`${out}/returned-${largeText?200:100}.png`});await context.close();
}}finally{await browser.close();await writeFile(`${out}/checks.json`,JSON.stringify(checks,null,2))}console.log(checks);
