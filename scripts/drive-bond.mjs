// Drives a Bond reading end to end on the live engine: Home entry, first-name validation, the two-ball reveal with its
// named bond, percentage and dated shared forecast, stability on a second reading, the two-ball story PNG, History and
// a 375 px large-text layout. Evidence (screenshots, PNG, engine log) goes to EVIDENCE (default .local/bond-evidence).
import {httpCredentials} from './preview-auth.mjs';
import {chromium,expect} from '@playwright/test';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const url=process.env.VERIFY_URL||'http://localhost:8087',out=process.env.EVIDENCE||'.local/bond-evidence';
await mkdir('.local',{recursive:true});await mkdir(out,{recursive:true});
const profile=await mkdtemp(`${process.cwd()}/.local/bond-browser-`);
const context=await chromium.launchPersistentContext(profile,{httpCredentials,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
const page=await context.newPage(),log=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('response',async response=>{if(response.request().method()==='POST'&&/\/engine$|:\d+\/?$/.test(response.url()))try{log.push({request:response.request().postDataJSON(),response:await response.json()})}catch{}});
const shot=async name=>{await page.waitForTimeout(1000);await page.screenshot({path:`${out}/bond-${name}.png`});};
async function home(){while(await page.getByTestId('close-flow').count())await page.getByTestId('close-flow').click();}
async function reveal(){await page.getByTestId('bond-pair').waitFor({timeout:90000});return {name:await page.getByTestId('bond-name').innerText(),percent:await page.getByTestId('bond-percent').innerText()};}

try{
 await page.goto(url);await page.getByTestId('birthday-month').click();await page.getByTestId('birthday-month').fill('08');await page.getByTestId('birthday-day').fill('01');await page.getByTestId('birthday-year').fill('1995');await page.getByTestId('continue').click();await page.getByTestId('about-done').click();
 await page.getByTestId('view-plans').click();await page.getByTestId('5-readings-1-99-simulate').click();await home();
 if(await page.getByText('Skip tour').count())await page.getByText('Skip tour').click();await page.getByTestId('dismiss-notice').click();await page.getByTestId('open-bond').scrollIntoViewIfNeeded();await expect(page.getByTestId('open-bond')).toBeVisible();await shot('home');
 await page.getByTestId('open-bond').click();await expect(page.getByText('Bond reading',{exact:true})).toBeVisible();
 await expect(page.getByTestId('look-into-the-future')).toHaveText('Read our bond');await expect(page.getByTestId('look-into-the-future')).toBeDisabled();
 await page.getByTestId('question-input').fill('Maya Lee');await expect(page.getByTestId('look-into-the-future')).toBeDisabled();
 await page.getByTestId('question-input').fill('Maya');await expect(page.getByTestId('look-into-the-future')).toBeEnabled();await shot('typing');
 await page.getByTestId('look-into-the-future').click();await expect(page.getByText('Reading the bond between you.')).toBeVisible();await shot('thinking');
 const first=await reveal();
 expect(first.name).toMatch(/^The Lantern and the [A-Z][a-z]+$/);expect(first.percent).toMatch(/^\d{2}%$/);
 await expect(page.getByText(/^You and Maya will .+ within \d+\smonths?\.$/)).toBeVisible();await expect(page.getByTestId('forecast-due-date')).toBeVisible();
 await expect(page.getByText('Your bond with Maya',{exact:true})).toBeVisible();await shot('reveal');
 await page.getByTestId('why-disclosure').click();await shot('reveal-why');await page.getByTestId('why-disclosure').click();
 await page.getByTestId('share-this-glimpse').click();await expect(page.getByText(/bond’s name and percentage/)).toBeVisible();await shot('share');
 const download=page.waitForEvent('download');await page.getByTestId('export-story-card').click();const file=`${out}/bond-story.png`;await(await download).saveAs(file);
 const meta=await sharp(file).metadata();expect([meta.width,meta.height]).toEqual([1080,1920]);
 await page.getByRole('button',{name:'Back to forecast'}).click();
 await page.getByTestId('read-another-bond').click();await page.getByTestId('question-input').fill('Maya');await page.getByTestId('look-into-the-future').click();
 const second=await reveal();expect(second).toEqual(first);
 await home();await page.reload();await page.getByTestId('tab-history').click();
 const saved=page.getByRole('button').filter({hasText:'What lies ahead for me and Maya?'});await expect(saved).toHaveCount(2);await shot('history');
 await saved.first().click();await expect(page.getByTestId('bond-name')).toHaveText(first.name);await expect(page.getByTestId('check-in-yes')).toBeVisible();
 await home();await page.getByTestId('open-settings').click();await page.getByLabel('Large text',{exact:true}).click();await page.setViewportSize({width:375,height:667});
 await page.getByTestId('tab-history').click();await saved.first().click();await page.getByTestId('bond-pair').waitFor();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(0);await shot('reveal-375-large');
 expect(errors).toEqual([]);
 log.push({first,second});
 console.log(`PASS: bond entry and name validation, live reveal ${first.name} ${first.percent}, stable on a second reading, two-ball 1080×1920 card, History and 375 px large text.`);
}catch(error){log.push({failure:String(error),pageErrors:errors});await shot('failure');throw error;}finally{await writeFile(`${out}/bond-drive.json`,JSON.stringify(log,null,2));await context.close();}
