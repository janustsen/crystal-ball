// First run and the small motions around it: the intro line and birthday sheet, Home with only the ball, the
// fade into Home from Sky and chip selection fades. Isolated Playwright; no engine calls.
import {chromium,expect} from '@playwright/test';
import {httpCredentials} from './preview-auth.mjs';
import {mkdir} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8087',evidence=process.env.FIRST_RUN_EVIDENCE||'.local/first-run';
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const opacity=locator=>locator.evaluate(el=>{let o=1;for(let n=el;n;n=n.parentElement)o*=+getComputedStyle(n).opacity;return o});
try{
 const page=await browser.newPage({httpCredentials,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(base,{timeout:120000});await page.getByTestId('onboarding-intro').waitFor({timeout:60000});
 // The sheet rises after the intro; typing advances through month, day and year, and Backspace on an empty field steps back.
 await expect(page.getByText('What’s your birthday?')).toBeInViewport({timeout:15000});await page.screenshot({path:`${evidence}/sheet.png`});
 await page.getByTestId('birthday-month').click();await page.keyboard.type('6');await expect(page.getByTestId('birthday-day')).toBeFocused();
 await page.keyboard.type('15');await expect(page.getByTestId('birthday-year')).toBeFocused();await page.keyboard.press('Backspace');await expect(page.getByTestId('birthday-day')).toBeFocused();
 await page.keyboard.press('Backspace');await page.keyboard.press('Backspace');await page.keyboard.type('31');await page.keyboard.type('2001');
 await page.getByTestId('birthday-month').fill('2');await page.getByTestId('birthday-day').fill('30');await page.getByTestId('continue').click();await expect(page.getByText('Check the month, day and year.')).toBeVisible();
 await page.getByTestId('birthday-month').fill('6');await page.getByTestId('birthday-day').fill('15');await page.getByTestId('birthday-year').fill('1995');await page.getByTestId('continue').click();await page.getByTestId('about-done').click();
 // No tour: a new account lands on the ball alone, with Tap to ask, no tab bar and one next step.
 await expect(page.getByTestId('tap-to-ask')).toBeVisible();await expect(page.getByRole('tab')).toHaveCount(0);
 await expect(page.getByTestId('next-step')).toContainText('1 more question to open History');await page.screenshot({path:`${evidence}/home-new.png`});
 await page.reload();await page.getByTestId('tap-to-ask').waitFor();await expect(page.getByRole('tab')).toHaveCount(0);
 // Sky opens at 12 questions; seed them to reach its chips.
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('crystal-ball-v1'));localStorage.setItem('crystal-ball-v1',JSON.stringify({...s,ladder:{asked:12,opened:['history','about','insight','bond']}}))});
 await page.reload();await page.getByTestId('open-sky').click();await expect(page.getByTestId('sky-intro')).toBeVisible();await expect(page.getByText('My school',{exact:true})).toBeVisible();
 // A chosen chip fades its gold fill in rather than snapping: sample the fill each frame after an in-page tap.
 const frames=await page.evaluate(()=>new Promise(done=>{const fill=()=>+getComputedStyle(document.querySelector('[data-testid="sky-theme-work"] [data-testid="surface-chip"] > div')).opacity,out=[],t0=performance.now();
  document.querySelector('[data-testid="sky-theme-work"]').click();const tick=()=>{out.push(fill());if(performance.now()-t0<500)requestAnimationFrame(tick);else done(out)};requestAnimationFrame(tick)}));
 const mid=frames.filter(o=>o>.05&&o<.95).length;expect(mid).toBeGreaterThan(1);expect(frames.at(-1)).toBe(1);
 // Home fades in on the way back from Sky.
 await page.getByTestId('header-back').click();await page.waitForTimeout(40);const early=await opacity(page.getByText('Tap to ask',{exact:true}));expect(early).toBeLessThan(1);
 await expect.poll(()=>opacity(page.getByText('Tap to ask',{exact:true}))).toBe(1);
 // Under reduced motion the sheet is up at once and an under-13 birthday blocks.
 const still=await browser.newPage({httpCredentials,viewport:{width:390,height:844},reducedMotion:'reduce'});
 await still.goto(base,{timeout:120000});await expect(still.getByTestId('birthday-month')).toBeInViewport();await still.getByTestId('birthday-month').fill('1');await still.getByTestId('birthday-day').fill('1');await still.getByTestId('birthday-year').fill('2020');await still.getByTestId('continue').click();
 await expect(still.getByText('Crystal Ball is for ages 13 and up.')).toHaveCount(1);await expect(still.getByTestId('skip-for-now')).toBeDisabled();await still.screenshot({path:`${evidence}/blocked.png`});
 console.log(`PASS: intro and birthday sheet, field advance, ball-only Home, Sky, chip fade (${mid} partial frames), Home fade (${early.toFixed(2)} at 40ms), reduced motion and under-13 block.`);
}finally{await browser.close()}
