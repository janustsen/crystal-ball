// Every ladder feature open (src/ladder.ts), as for an account that has asked its 20 starter questions. Drivers that
// cover a feature rather than the ladder seed this to reach History, You, Sky and the Inner Library; the allowance is
// then the daily free question, as it was before the ladder.
export const allOpen={asked:20,opened:['history','about','insight','bond','sky','library']};
// The same seed as a statement for chrome-devtools-axi page.eval scripts.
// It waits for the saved account so a seed right after onboarding does not drop it.
export const seedLadder=`while(!JSON.parse(localStorage.getItem('crystal-ball-v1')||'{}').onboardingDone)await new Promise(r=>setTimeout(r,100));localStorage.setItem('crystal-ball-v1',JSON.stringify({...JSON.parse(localStorage.getItem('crystal-ball-v1')),ladder:${JSON.stringify(allOpen)}}));`;
// After onboarding: open every feature and reload.
export async function openEverything(page){
 await page.getByTestId('tap-to-ask').waitFor({timeout:60000});
 await page.evaluate(`(async()=>{${seedLadder}})()`);
 // A link (a Circle invite, a seal) may land on Sky rather than Home; the tab bar shows either way.
 await page.reload();await page.getByTestId('tab-home').waitFor({timeout:60000});
}
// Tap to ask lives on Home, where the old Ask tab worked from any tab: return Home first when the tab bar is up.
export async function tapToAsk(page){
 if(await page.getByTestId('tab-home').count())await page.getByTestId('tab-home').click();
 await page.getByTestId('tap-to-ask').click();
}
// Tonight's Sky opens from its line on Home, where it used to be a tab.
export async function openSky(page){
 if(await page.getByTestId('tab-home').count())await page.getByTestId('tab-home').click();
 await page.getByTestId('open-sky').click();
}
