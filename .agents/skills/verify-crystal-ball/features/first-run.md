# First run

## Sub-features
The intro line (“I know your future.” with glinting sparkles), the birthday sheet (month, day and year fields that advance as each completes), Skip for now → age confirmation, the under-13 block, the four-step tour (Ask, Sky, History, You; shown once, Take the tour in Settings re-opens it), Sky's in-place explanations, and tab transitions and chip feedback following the [motion language](../../../../docs/design/motion-language.md).

## How to get to it (user POV)
A fresh profile opens on the intro; the sheet rises about 2.6 s later (at once under reduced motion). The tour starts on Home after the birthday or age confirmation.

## Driving it
`PREVIEW_URL=<owned preview> node scripts/drive-first-run.mjs` (isolated Playwright, no engine calls; screenshots in `FIRST_RUN_EVIDENCE`, default `.local/first-run`).

## Gotchas
Drivers that onboard land on Home with the tour showing; its dim layer passes touches through and any tab or ball press ends it, so later clicks still work. Onboarding no longer creates a memory fact: drivers that edit or forget one seed `current_focus` first. Native field focus, keyboard and the masked scroll fade need the iOS Simulator; browser runs are not native proof.
