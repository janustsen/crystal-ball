import {httpCredentials,previewFetch as fetch} from './preview-auth.mjs';
import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const base=process.env.PREVIEW_URL||'http://localhost:8087';
const health=await fetch(`${base}/engine/health`).then(r=>r.json());
const expectedProvider=process.env.EXPECTED_MODEL_PROVIDER||'ollama';
if(!['ollama','codex'].includes(expectedProvider)||health.app!=='crystal-ball'||health.provider!==expectedProvider)throw new Error('Expected the selected real local development engine');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({httpCredentials,viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,acceptDownloads:true});
context.setDefaultTimeout(30000);
const page=await context.newPage(),evidence='docs/evidence/design-2026-09-30',log=[{at:new Date().toISOString(),base,health}],errors=[];
await mkdir(evidence,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));
page.on('response',async r=>{if(r.url()===`${base}/engine`&&r.request().method()==='POST')try{log.push({action:r.request().postDataJSON().action,response:await r.json()})}catch{}});
const shot=async name=>{await page.waitForTimeout(750);await page.screenshot({path:`${evidence}/${name}.png`});log.push({screen:name})};
const close=()=>page.getByTestId('close-flow').click();
const count=async()=>Number((await page.getByTestId('view-plans').innerText()).match(/\d+/)?.[0]);
const dismiss=async()=>{if(await page.getByTestId('dismiss-notice').count())await page.getByTestId('dismiss-notice').click()};
async function ask(q){await page.getByTestId('tab-ask').click();await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill(q);await page.getByTestId('look-into-the-future').click()}
async function scan(name){const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();log.push({accessibility:name,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});expect(r.violations).toEqual([])}
try{
 await page.goto(base);await page.getByTestId('tab-ask').waitFor();await shot('01-home');await scan('home');
 await page.getByTestId('hero-orb').click();await expect(page.getByText('Come closer…')).toBeVisible();await shot('02-approach');await page.getByTestId('type-instead').waitFor();await shot('03-listening-fallback');await expect(page.getByTestId('tab-home')).toHaveCount(0);
 await page.getByTestId('type-instead').click();await page.getByTestId('question-input').fill('Will I be conversational in Spanish in six months?');await shot('04-typing');await scan('typing');
 await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').waitFor({timeout:65000});
 await shot('05-question-one');await scan('borderless question');await page.getByTestId('option-0').click();
 await page.getByTestId('option-3').waitFor();await shot('06-question-two');await page.getByTestId('option-3').click();await page.getByTestId('other-input').fill('30 minutes');await scan('own answer');await page.getByTestId('answer-next').click();
 await page.getByTestId('option-1').waitFor();await shot('07-question-three');await page.getByTestId('option-1').click();await shot('08-thinking');
 await page.getByTestId('share-this-glimpse').waitFor({timeout:65000});await expect(page.getByText(/6\s+months/).first()).toBeVisible();expect(await count()).toBe(0);await page.getByTestId('why-disclosure').click();await shot('09-reveal-why');await scan('reveal');
 await page.getByTestId('share-this-glimpse').click();await shot('10-share');await page.getByTestId('preview-story-card').click();await shot('11-story-card');const download=page.waitForEvent('download');await page.getByTestId('export-story-card').click();const imagePath=`${evidence}/story-1080x1920.png`;await(await download).saveAs(imagePath);const metadata=await sharp(imagePath).metadata();expect([metadata.width,metadata.height]).toEqual([1080,1920]);await dismiss();await page.getByRole('button',{name:'Back to sharing',exact:true}).click();
 await page.route('**/engine/share',route=>route.fulfill({status:500,body:'Injected export failure'}));await page.getByTestId('export-animated-story').click();await expect(page.getByText(/Animation could not be exported/)).toBeInViewport();log.push({exportFailureRecovery:true});await page.unroute('**/engine/share');await dismiss();
 await page.getByTestId('share-reminder').click();await expect(page.getByText(/Native reminder preview/)).toBeVisible();await dismiss();await close();await close();
 await page.getByTestId('tab-history').click();await shot('16-history');await page.reload();await page.getByTestId('tab-history').click();await page.getByRole('button').filter({hasText:'Spanish'}).first().click();await expect(page.getByText('Did it come true?')).toBeVisible();await page.getByRole('button',{name:'Yes',exact:true}).click();await dismiss();await close();await page.getByTestId('tab-history').click();await expect(page.getByText('✓ Came true')).toBeVisible();
 await page.getByTestId('tab-you').click();await shot('17-you');const fact=page.locator('[data-testid^="edit-"]').first();const key=(await fact.getAttribute('data-testid')).slice(5);await fact.click();await page.getByLabel(`Edit ${key}`,{exact:true}).fill('Beginner');await page.getByRole('button',{name:'Save fact',exact:true}).click();await page.getByRole('button',{name:`Forget ${key}`,exact:true}).click();await page.getByRole('button',{name:'Undo forget',exact:true}).click();await dismiss();await expect(page.getByText('Beginner',{exact:true})).toBeVisible();
 await page.getByTestId('view-plans').click();await shot('14-plans');await scan('plans');await page.getByTestId('5-readings-1-99-simulate').click();expect(await count()).toBe(5);await dismiss();await page.getByRole('button',{name:'Restore purchases',exact:true}).click();await expect(page.getByText(/Test mode has no App Store/)).toBeVisible();await dismiss();await close();
 await page.getByTestId('tab-home').click();await ask('Will my IVF succeed?');await page.getByText('This one isn’t for the Ball.').waitFor({timeout:65000});expect(await count()).toBe(5);await shot('13-sensitive');await scan('sensitive redirect');await close();
 // Recovery is a real browser request failure, not a fabricated prediction.
 await page.route('**/engine',route=>route.abort('failed'));await ask('Will I learn to play piano this year?');await page.getByText('The mist is too thick.',{exact:true}).waitFor();expect(await count()).toBe(5);await shot('12-error');await page.unroute('**/engine');await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByTestId('option-0').waitFor({timeout:65000});await close();await close();
 await page.getByTestId('tab-sky').click();await page.getByTestId('sky-theme-work').click();await shot('15-sky');await page.getByRole('button',{name:'Ask this too',exact:true}).click();await expect(page.getByTestId('question-input')).not.toHaveValue('');await close();
 await page.getByTestId('tab-you').click();await page.getByRole('switch',{name:'Reduce motion',exact:true}).click();await page.getByRole('switch',{name:'Large text',exact:true}).click();await page.setViewportSize({width:375,height:667});await page.getByTestId('tab-home').click();await shot('small-large-text-reduced-motion');for(const tab of ['home','sky','ask','history','you'])await expect(page.getByTestId(`tab-${tab}`)).toBeInViewport();await scan('large text home');
 expect(errors).toEqual([]);log.push({passed:true,errors});
}catch(error){log.push({failure:String(error),errors});await shot('failure');process.exitCode=1;console.error(error)}finally{await writeFile(`${evidence}/drive.json`,JSON.stringify(log,null,2));await context.close();await browser.close()}
