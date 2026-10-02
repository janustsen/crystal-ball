import AxeBuilder from '@axe-core/playwright';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/ux-controls';
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),log=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
 await page.goto(base);await page.getByTestId('tab-you').click();
 for(const name of ['Ambient sound','Reduce motion','Large text']){
  const control=page.getByRole('switch',{name,exact:true});await control.scrollIntoViewIfNeeded();const box=await control.boundingBox();log.push({name,...box});expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
 }
 const large=page.getByRole('switch',{name:'Large text',exact:true});
 await page.getByText('Large text (200%)',{exact:true}).click();await expect(large).toBeChecked();
 await large.focus();await page.keyboard.press('Space');await expect(large).not.toBeChecked();await page.keyboard.press('Enter');await expect(large).toBeChecked();await page.keyboard.press('Space');await expect(large).not.toBeChecked();
 await expect(large).toHaveCSS('outline-style','solid');await page.screenshot({path:`${out}/settings-focus.png`});
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations).toEqual([]);log.push({settingsAxeViolations:axe.violations.length});
 await page.getByRole('switch',{name:'Reduce motion',exact:true}).click();await page.reload();await page.getByTestId('tab-you').click();await expect(page.getByRole('switch',{name:'Reduce motion',exact:true})).toBeChecked();
 await page.getByTestId('tab-sky').click();await page.getByTestId('social-section-circles').click();await expect(page.getByText('Circles are offline right now.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Create my circle',exact:true})).toBeDisabled();
 await page.screenshot({path:`${out}/circles-offline.png`});
 log.push({labelTap:true,spaceToggle:true,preferencePersists:true,offlineCreationDisabled:true});
}finally{await browser.close();await writeFile(`${out}/controls.json`,JSON.stringify(log,null,2));console.log(JSON.stringify(log,null,2))}
