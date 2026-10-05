// Captures assets/home-scene.jpg, the native Home backdrop, from the web three.js scene.
// 600×844 is wider than any phone at that height, so native can height-fit and centre-crop it.
// Run against a web preview: PREVIEW_URL=http://localhost:8087 node scripts/capture-home-scene.mjs
import {chromium} from 'playwright';
import sharp from 'sharp';
const base=process.env.PREVIEW_URL||'http://localhost:8087';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:600,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
await page.goto(base);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();
await page.getByTestId('hero-orb').waitFor();
// Widen the phone shell, then hide the text and controls drawn over the scene and its lens overlays.
await page.addStyleTag({content:'[data-testid="app-shell"]{max-width:none!important}'});
await page.waitForTimeout(500);
await page.addStyleTag({content:'[role=tablist],[data-testid=hero-orb]~*{visibility:hidden!important}'});
await page.waitForTimeout(4000);
const png=await page.locator('canvas').locator('..').screenshot();
await sharp(png).jpeg({quality:80,mozjpeg:true}).toFile('assets/home-scene.jpg');
await browser.close();
console.log('assets/home-scene.jpg written');
