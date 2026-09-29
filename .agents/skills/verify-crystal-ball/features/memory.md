# Memory

## Sub-features
Edit/delete known facts; persisted history; yes/no/pending check-back and local reminder.

## How to get to it (user POV)
You for facts; History for earlier readings.

## Driving it with chrome-devtools-axi
Edit a fact, reload, verify value; forget it, Undo and verify restoration, forget it again, ask again and verify it returns as a card. Open History and mark an outcome; fresh reveals keep outcome entry hidden. scripts/drive-states.mjs asserts Undo and re-asking.

## Gotchas
Friends never teach the owner bank. Saving an edited fact runs the same validation as its card, so an invalid value (for example a savings runway without months or years) shows an inline message and is not saved. Web reminder is an explicit preview, not a scheduled native notification.
