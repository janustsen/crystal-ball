# Core pricing and check-ins

Verified 2026-10-03 on isolated localhost:8104 / engine:8804. Health reported `crystal-ball` / `ollama`; unauthenticated engine health returned 401.

- `npm run check`: passed after the final UI change.
- `npm test`: 124 passed, zero failures. Fake Date tests cover both check-in bounds, leap day, the two notification times, no subsequent reminders, repeated scheduling, all three answers and cancellation during permission/scheduling.
- `VERIFY_URL=http://localhost:8104 node scripts/verify-core-pricing.mjs`: passed using chrome-devtools-axi. [Transcript](browser.txt) includes the actual local Qwen result: a ten-year forecast with a check-in one calendar year away. It verifies weekly default/selection, all prices and cancellation terms, 25 purchased credits, simulated weekly Plus, saved Not yet and reload. The web reminder assertion checks only the native-reminder preview, not answered-reading suppression. That coverage lives in `tests/love-notifications.test.mjs`, which exercises the iOS and Android branches with mocked notification APIs; it is not device-delivery evidence.
- [Final large-text image](large-paywall.png): inspected at 375px and 200% text; all three cards stack their content and fit the viewport ([measurements](layout.txt)). [Earlier image](large-paywall-before.png) preserved: horizontal fit alone missed cramped terms. The final layout fixes that readability failure. [Earlier measurements](layout-before.txt) are not a readability pass.
- [Normal-size image](../core-pricing-paywall.png): inspected; weekly default and yearly equivalent are visible.

## Blast radius

Safety depends on preserving forecast horizons independently of the check-in date, and serializing cancellation after in-flight notification writes. `tests/core-mechanics.test.ts` executes the real date and native-action functions to prove both; the existing engine tests still verify long-horizon headlines with newly bounded check-ins. Answered readings are canceled on Store hydration/history changes, covering reload and backup restore as well as the answer buttons. Any answer, including Not yet, suppresses new scheduling. Repeated manual scheduling first cancels both stable per-reading identifiers.

Notification routing retains the original reading ID in both payloads. The Expo notification adapter adds a separate identifier for the follow-up; notification bodies contain no forecast text. Forget-all's existing queued cleanup tests remain green. Social Circle readings still use their existing 30-day fallback, within the requested range; their payload format is unchanged.

Native delivery is a mocked boundary in the fake-clock tests, not a device pass. No iOS/Android device or real billing was exercised. The browser proves behavior, not predictive accuracy. Existing unrelated motion/social/full-design suites were not re-driven for this focused change.

## Single Greptile fix round

Greptile identified stale reminder suppression when an older backup restores a reading without its previously saved answer. `scripts/verify-restored-reminders.mjs` failed before the fix with “Restored unanswered reading is still suppressed” ([failure](restore-before.txt)). The Store now reopens reminder eligibility for each currently unanswered reading, without clearing other saved answers. The same driver passes after the fix ([result](restore-after.txt)); it fixtures only the restored payload and exercises the real Store, answer UI and reminder action. This does not claim Apple/Supabase transport or native notification delivery.

TypeScript and all 125 tests passed after the fix, including the original in-flight cancellation tests and a new native/web eligibility check. The regression script was committed before the fix. The partial-scheduling and repeated-cleanup P2 findings remain follow-ups in https://github.com/janustsen/crystal-ball/issues/18 and https://github.com/janustsen/crystal-ball/issues/19.
