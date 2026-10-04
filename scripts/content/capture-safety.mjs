import {assertSafe} from './hooks.mjs';

export async function assertHomeSafe(page){
 const panel=page.getByTestId('daily-omen');
 await panel.locator('[aria-live="polite"]').waitFor();
 await page.locator('[data-testid="daily-omen"][aria-busy="false"]').waitFor({timeout:90000});
 assertSafe(await panel.locator('[aria-live="polite"]').innerText());
}

export async function assertFollowUpSafe(page){
 const options=page.getByRole('radiogroup');
 assertSafe(await options.evaluate(el=>el.previousElementSibling.textContent));
 for(const text of await options.getByRole('radio').allTextContents())assertSafe(text.replace(/^✧\s*/,''));
}
