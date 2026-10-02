// Freeze CSS entrances at sampled times; composite text opacity against actual rendered backgrounds.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {measureTextContrast} from './measure-text-contrast.mjs';
const base=process.env.PREVIEW_URL||'http://localhost:8098',out=process.env.UX_EVIDENCE||'.local/transition-contrast';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),samples=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await page.goto(base);await page.getByTestId('hero-orb').waitFor();
 for(const screen of ['you','history','sky','plans']){
  if(screen==='plans')await page.getByTestId('view-plans').click();else await page.getByTestId(`tab-${screen}`).click();
  for(const phase of [0,.25,.5,1]){
   const count=await page.evaluate(phase=>{const animations=document.getAnimations().filter(a=>a.animationName==='mist-arrive');for(const a of animations){a.pause();const t=a.effect.getTiming();a.currentTime=t.delay+Number(t.duration)*phase}return animations.length},phase);expect(count).toBeGreaterThan(0);
   await page.screenshot({path:`${out}/${screen}-${phase}.png`});samples.push({screen,phase,text:await measureTextContrast(page,undefined,true)});
  }
 }
}finally{await browser.close();await writeFile(`${out}/contrast.json`,JSON.stringify(samples,null,2))}
const failures=samples.flatMap(s=>s.text.filter(t=>t.contrast<t.required).map(t=>({screen:s.screen,phase:s.phase,...t})));
console.log(JSON.stringify({samples:samples.length,failures},null,2));expect(failures).toEqual([]);
