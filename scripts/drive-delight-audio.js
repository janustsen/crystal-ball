// On You with Ambient sound off, in the isolated cb-delight-final browser profile.
// Wraps the real media methods for observation; does not stub playback.
await page.eval(()=>{window.audioEvents=[];for(const method of ['play','pause']){const original=HTMLMediaElement.prototype[method];HTMLMediaElement.prototype[method]=function(...args){window.audioEvents.push({method,source:this.src});return original.apply(this,args);};}});
await page.click('[aria-label="Ambient sound"]');
await page.wait(300);
await page.click('[data-testid=tab-ask]');
await page.wait('[data-testid=type-instead]');
const paused=await page.eval(()=>window.audioEvents.filter(e=>e.source.includes('hum')).at(-1)?.method);
if(paused!=='pause')throw new Error('Ambient audio did not pause for voice');
await page.click('[data-testid=type-instead]');
await page.wait('[data-testid=question-input]');
await page.wait(300);
const resumed=await page.eval(()=>window.audioEvents.filter(e=>e.source.includes('hum')).at(-1)?.method);
if(resumed!=='play')throw new Error('Enabled ambient audio did not resume after voice');
await page.click('[data-testid=close-flow]');
await page.click('[data-testid=tab-you]');
await page.click('[aria-label="Ambient sound"]');
await page.wait(300);
const disabled=await page.eval(()=>window.audioEvents.filter(e=>e.source.includes('hum')).at(-1)?.method);
if(disabled!=='pause')throw new Error('Sound did not stop when disabled');
console.log('real media boundary',JSON.stringify({paused,resumed,disabled}));
