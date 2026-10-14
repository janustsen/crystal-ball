// The room ball across GL support, with a Plus ball style on the preview's simulated plan: WebGL1 (WebGL2 disabled)
// must compile the glass shader and draw the live ball; no WebGL must fall back to the static orb wearing the style.
// Run against a web preview: PREVIEW_URL=http://localhost:8087 node scripts/check-room-webgl.mjs
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.PREVIEW_URL||'http://localhost:8087';
async function ball(arg){
 const browser=await chromium.launch({channel:'chrome',headless:true,args:[arg]});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(base);await page.getByTestId('skip-for-now').click();await page.getByTestId('confirm-age').click();await page.getByTestId('about-done').click();
  await page.getByTestId('hero-orb').waitFor();
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('crystal-ball-v1'));s.plus=true;s.ballStyle='aurora';localStorage.setItem('crystal-ball-v1',JSON.stringify(s))});
  await page.reload();await page.getByTestId('hero-orb').waitFor();await page.waitForTimeout(3000);
  return {...await page.evaluate(()=>({
   live:document.querySelector('canvas[width]')?.style.visibility==='visible',
   styledFallback:!!document.querySelector('[data-testid=orb-style]'),
  })),shaderErrors:errors.filter(e=>/shader/i.test(e))};
 }finally{await browser.close()}
}
const webgl1=await ball('--disable-webgl2');
assert.deepEqual(webgl1,{live:true,styledFallback:false,shaderErrors:[]},'WebGL1 draws the live styled ball');
const none=await ball('--disable-3d-apis');
assert.equal(none.live,false,'without WebGL the live ball is hidden');
assert.equal(none.styledFallback,true,'without WebGL the static orb wears the chosen style');
console.log(JSON.stringify({webgl1,none}));
