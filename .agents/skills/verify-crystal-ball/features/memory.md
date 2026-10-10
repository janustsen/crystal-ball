# Memory

## Sub-features
Edit/delete known facts; persisted history; yes/no/pending check-back and local reminder.

## How to get to it (user POV)
You for facts; History for earlier readings.

## Driving it with chrome-devtools-axi
Edit a fact, reload, verify value; forget it, Undo and verify restoration, forget it again and verify the persisted fact is removed. Typed known-input skip/re-asking is covered by the executable engine tests; general cards are session-only. Open History and mark an outcome; fresh reveals keep outcome entry hidden. scripts/drive-design.mjs covers Undo; scripts/drive-design-memory.mjs proves seeded memory-fact deletion, friend isolation and Forget everything preserving plan/credits. Close the immersive reveal before changing tabs.

Run `npx tsx --test tests/core-mechanics.test.ts` for due-date bounds, and `npx tsx --test tests/ritual.test.ts tests/check-in.test.ts` for shared planning, grouped reminder cleanup and persisted delivery-budget boundaries. See [README](../../../../../README.md) for check-in behavior and [the ritual drive](ritual.md) for native verification. OS delivery in these tests is mocked; confirm native delivery/cancellation on a configured device. `scripts/verify-core-pricing.mjs` drives the real Ollama forecast and saved-answer flow.

For restored unanswered readings, use the restore case in `tests/check-in.test.ts` for scheduler coverage and verify the restored archive on native for delivery. The older `scripts/verify-restored-reminders.mjs` expects the superseded per-reading web suppression message and is not a current verification drive; web now returns the native-reminder preview before checking the reading. Remote Apple/Supabase restoration remains a separate native check.

## Gotchas
Friends never teach the owner bank. Saving an edited fact runs the same validation as its card, so an invalid value (for example a savings runway without months or years) shows an inline message and is not saved. Web reminder is an explicit preview, not a scheduled native notification.

Follow the [onboarding and age-confirmation usage](../../../../README.md) and [profile contract](../../../../SETUP.md#reading-profile-and-birth-chart). Verify Forget everything against that usage contract, including retained eligibility and plan/credit accounting.
