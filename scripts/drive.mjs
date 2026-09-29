import {chromium} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,acceptDownloads:true});
const page=await context.newPage();const log=[];page.on('pageerror',e=>log.push({error:e.message}));
await mkdir('docs/evidence',{recursive:true});
const shot=async name=>{await page.screenshot({path:`docs/evidence/${name}.png`});log.push({screen:name,url:page.url(),at:new Date().toISOString()});};
try{
 await page.goto('http://localhost:8087');await page.getByTestId('tab-ask').waitFor();await shot('home');
 await page.getByTestId('tab-ask').click();await page.getByTestId('question-input').fill('Will I be conversational in Spanish in six months?');await shot('ask');
 const start=Date.now();await page.getByTestId('look-into-the-future').click();await page.getByTestId('option-0').waitFor({timeout:65000});
 for(let i=0;i<4;i++){
  await shot(`question-${i+1}`);await page.getByTestId(i===1?'option-3':'option-0').click();if(i===1)await page.getByTestId('other-input').fill('30 minutes');await shot(`selected-${i+1}`);await page.getByTestId('answer-next').click();
 }
 await shot('research');await page.getByTestId('share-this-glimpse').waitFor({timeout:65000});log.push({flowSeconds:(Date.now()-start)/1000});await shot('reveal');
 await page.getByTestId('why-disclosure').click();await shot('why');
 await page.getByTestId('share-this-glimpse').click();await shot('share');const download=page.waitForEvent('download');await page.getByTestId('export-story-card').click();await(await download).saveAs('docs/evidence/exported-card.png');const clip=page.waitForEvent('download',{timeout:65000});await page.getByTestId('export-animated-story').click();await(await clip).saveAs('docs/evidence/exported-story.mp4');
 await page.getByTestId('tab-history').click();await shot('history');await page.reload();await page.getByTestId('tab-history').click();await page.getByText('Your little archive of tomorrow.').waitFor();
 await page.getByTestId('tab-you').click();await shot('knowledge');
 await page.getByTestId('view-plans').click();await shot('paywall');await page.getByTestId('5-readings-1-99-simulate').click();await page.getByText('Test purchase complete. No payment was taken.').waitFor();await shot('paywall-purchased');
 await page.getByTestId('tab-explore').click();await shot('explore');
 await page.getByTestId('tab-ask').click();if(await page.getByTestId('ask-another-question').count())await page.getByTestId('ask-another-question').click();await page.getByTestId('question-input').fill('Will my IVF succeed?');await page.getByTestId('look-into-the-future').click();await page.getByText('Let’s look toward something gentler.').waitFor({timeout:65000});await shot('blocked');
 await page.getByTestId('tab-home').click();await page.setViewportSize({width:375,height:667});await shot('home-small');
 await context.storageState({path:'.local/browser-state.json'});
}catch(error){log.push({failure:String(error)});await shot('failure');process.exitCode=1;}finally{await writeFile('docs/evidence/drive.json',JSON.stringify(log,null,2));await browser.close();}
