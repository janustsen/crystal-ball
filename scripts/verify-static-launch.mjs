// Drive the actual exported artifact; the fixture project's unavailable network is explicitly simulated.
import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const origin=process.env.STATIC_URL||'http://localhost:8118',evidence=process.env.EVIDENCE_DIR;
if(!evidence)throw new Error('Set EVIDENCE_DIR to an owned proof directory.');
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:375,height:667},isMobile:true});
 await page.route('https://launch-verification.supabase.co/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"Local build fixture: backend unavailable"}'}));
 await page.goto(origin);await expect(page.getByTestId('birthday-month')).toBeVisible();
 for(const [route,title] of [['privacy','Privacy policy'],['terms','Terms of use'],['support','Support']]){
  await page.goto(`${origin}/${route}/`);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  if(route==='privacy'){
   const section=page.locator('section').filter({has:page.getByRole('heading',{name:'AI providers',exact:true})});
   await expect(section).toBeVisible();
   await expect(section).toContainText('Cloudflare, Inc');
   await expect(section).toContainText('DeepInfra, Inc');
   await expect(section).toContainText('When the free allowance cannot admit a request');
   await expect(section.getByRole('link',{name:'Cloudflare data usage'})).toHaveAttribute('href','https://developers.cloudflare.com/workers-ai/platform/data-usage/');
   await expect(section.getByRole('link',{name:'DeepInfra data privacy'})).toHaveAttribute('href','https://docs.deepinfra.com/account/data-privacy');
   await expect(page.getByText(/News lookups are off/)).toBeVisible();
  }
  if(route==='support')await expect(page.getByRole('link',{name:'janustsen@outlook.com'}).first()).toHaveAttribute('href',/^mailto:janustsen@outlook.com/);
  await page.screenshot({path:`${evidence}/${route}.png`,fullPage:true});
 }
 console.log('PASS: exported Expo onboarding and all three static information pages, named provider, News-off copy, email links and 375px layout. Backend is a local fixture.');
}finally{await browser.close()}
