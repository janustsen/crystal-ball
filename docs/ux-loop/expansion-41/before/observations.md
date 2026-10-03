# First comparison retained, not used as the decision

Both initial comparisons selected readerA/check-inB/HomeA, but alternative readers were defective. ReaderB lacked its closing select tag, so its body was parsed into the select and absent. ReaderC handled delayed native toggle events by closing siblings, allowing an older reason-toggle event to close the newly opened answers. Home's overlay lacked a stacking level, letting the orb pedestal show through. These are prototype defects, not evidence against the intended designs.

Fixes: close the select, render accordion selection synchronously from the clicked summary, and give the overlay its own foreground stacking level. Capture now asserts actual reason/answer visibility and one open accordion; check-in additionally captures the lower options after scrolling. Preserve this failed pass and compare all corrected alternatives independently.
