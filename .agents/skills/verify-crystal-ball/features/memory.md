# Memory

## Sub-features
Edit/delete known facts; persisted history; yes/no/pending check-back and local reminder.

## How to get to it (user POV)
You for facts; History for earlier readings.

## Driving it with chrome-devtools-axi
Edit a fact, reload, verify value; forget it, Undo and verify restoration, forget it again and verify the persisted fact is removed. Typed known-input skip/re-asking is covered by the executable engine tests; general cards are session-only. Open History and mark an outcome; fresh reveals keep outcome entry hidden. scripts/drive-design.mjs covers Undo; scripts/drive-design-memory.mjs proves onboarding-memory deletion, friend isolation and Forget everything preserving plan/credits. Close the immersive reveal before changing tabs.

## Gotchas
Friends never teach the owner bank. Saving an edited fact runs the same validation as its card, so an invalid value (for example a savings runway without months or years) shows an inline message and is not saved. Web reminder is an explicit preview, not a scheduled native notification.

Birthday and current focus onboarding is skippable. You supports editing/forgetting birthday and optional birth time/city for local Moon/rising. Unknown ages use teen-safe defaults; under-13 onboarding is blocked. Top-level birthday/sunSign/ageBand are shared profile fields. Forget everything clears these and reading memories, preserving plan/credit accounting.
