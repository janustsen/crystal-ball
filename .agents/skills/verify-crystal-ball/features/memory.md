# Memory

## Sub-features
Edit/delete known facts; persisted history; yes/no/pending check-back and local reminder.

## How to get to it (user POV)
You for facts; History for earlier readings.

## Driving it with chrome-devtools-axi
Edit a fact, reload, verify value; forget it, Undo and verify restoration, forget it again and verify the persisted fact is removed. Typed known-input skip/re-asking is covered by the executable engine tests; general cards are session-only. Open History and mark an outcome; fresh reveals keep outcome entry hidden. scripts/drive-design.mjs covers Undo; scripts/drive-design-memory.mjs proves onboarding-memory deletion, friend isolation and Forget everything preserving plan/credits. Close the immersive reveal before changing tabs.

Run `npx tsx --test tests/core-mechanics.test.ts` for the fake-clock boundary proof: check-ins stay 1 day to 1 calendar year out, notifications fire on the due date and once 3 days later, and any answer (including Not yet) cancels the reminder. OS delivery is mocked; confirm native delivery/cancellation on a configured device. `scripts/verify-core-pricing.mjs` drives the real Ollama forecast and saved-answer flow.

`VERIFY_URL=http://localhost:8104 node scripts/verify-restored-reminders.mjs` reproduces the older-unanswered-backup regression through the real Store and reminder UI. It fixtures the restored payload, not remote Apple/Supabase transport; an unanswered restored reading must reopen reminders without a reload while other saved answers stay suppressed.

## Gotchas
Friends never teach the owner bank. Saving an edited fact runs the same validation as its card, so an invalid value (for example a savings runway without months or years) shows an inline message and is not saved. Web reminder is an explicit preview, not a scheduled native notification.

Follow the [onboarding and age-confirmation usage](../../../../README.md) and [profile contract](../../../../SETUP.md#reading-profile-and-birth-chart). Verify Forget everything against that usage contract, including retained eligibility and plan/credit accounting.
