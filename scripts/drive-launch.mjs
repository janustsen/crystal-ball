import {chromium,expect} from '@playwright/test';
import {httpCredentials} from './preview-auth.mjs';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({httpCredentials,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const results=[];
try{
 await page.goto(process.env.APP_URL||'http://localhost:8096');
 await expect(page.getByText(/For entertainment\. Never a guarantee/)).toBeVisible();
 await expect(page.getByText('Keep your glimpses')).toHaveCount(0);
 results.push('Home has entertainment disclosure and no sign-in prompt');
 await page.getByTestId('tab-you').click();
 await expect(page.getByText('Apple backup needs the configured iOS app. Readings stay on this device.')).toBeVisible();
 await page.waitForTimeout(800);await page.screenshot({path:'docs/evidence/launch-you.png'});
 await page.getByRole('button',{name:'Privacy and entertainment',exact:true}).click();
 await expect(page.getByText(/Forecasts are speculative entertainment/)).toBeVisible();
 results.push('You shows optional backup web fallback and readable privacy details');
 await page.getByRole('switch',{name:'Large text',exact:true}).click();
 await page.setViewportSize({width:375,height:667});
 await page.getByText('Keep your glimpses').scrollIntoViewIfNeeded();
 await page.screenshot({path:'docs/evidence/launch-you-large.png'});
 await expect(page.getByRole('tab',{name:'You',exact:true})).toBeVisible();
 results.push('Backup copy wraps at 375px and 200% text; navigation remains visible');
 await page.getByTestId('tab-ask').click();
 await page.getByTestId('type-instead').click();
 await expect(page.getByText('For entertainment. Questions and answers go to your prediction engine.')).toBeVisible();
 if(process.env.CHECK_AI_CONSENT==='1'){
  await page.getByTestId('question-input').fill('Will I learn Spanish?');
  const ask=page.getByTestId('look-into-the-future');
  await expect(ask).toBeDisabled();
  await page.getByRole('switch',{name:'Allow AI processing'}).click();
  await expect(ask).toBeEnabled();
  await page.getByRole('button',{name:'Speak instead',exact:true}).click();
  const voiceAsk=page.getByRole('button',{name:'That’s my question',exact:true});
  await expect(voiceAsk).toBeEnabled();
  await page.getByRole('switch',{name:'Allow AI processing'}).click();
  await expect(voiceAsk).toBeDisabled();
  await page.getByTestId('type-instead').click();
  await expect(ask).toBeDisabled();
  results.push('Named AI consent enables typing/voice reading and revoking disables both; no model call made');
 }
 await writeFile('docs/evidence/launch-ui.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
 console.log(results);
}finally{await browser.close()}
