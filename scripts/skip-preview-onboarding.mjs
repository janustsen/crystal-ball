// Use the real optional onboarding path in isolated browser checks of later screens.
export async function skipPreviewOnboarding(page){
 await page.locator('[data-testid="skip-for-now"],[data-testid="tab-home"],[data-testid="question-input"]').first().waitFor();
 if(await page.getByTestId('skip-for-now').count()){
  await page.getByTestId('skip-for-now').click();
  await page.getByTestId('confirm-age').click();
 }
}
