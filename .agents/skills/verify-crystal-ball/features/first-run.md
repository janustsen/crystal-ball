# First run

## Sub-features
The intro line (“I know your future.” with glinting sparkles), the birthday sheet (month, day and year fields that advance as each completes, plus the optional where-did-you-hear chips `heard-*`, submitted on the final Continue or Skip for now in The Ball asks; `drive-gtm.mjs` covers them), Skip for now → age confirmation, the under-13 block, Home with only the ball after onboarding (no tour, no tab bar), and transitions and chip feedback following the [motion language](../../../../docs/design/motion-language.md).

## How to get to it (user POV)
A fresh profile opens on the intro; the sheet rises about 2.6 s later (at once under reduced motion). Home shows the ball alone after completing the [onboarding flow](../../../../../README.md), including answering or skipping the optional questions.

## Driving it
`PREVIEW_URL=<owned preview> node scripts/drive-first-run.mjs` (isolated Playwright, no engine calls; screenshots in `FIRST_RUN_EVIDENCE`, default `.local/first-run`).

## Gotchas
Drivers that onboard land on a brand-new account: only Home, with no tab bar until the first question (see the [question ladder](ladder.md)). Drivers that need every screen seed `ladder` in `crystal-ball-v1` (as `check-layout.mjs` does) or a pre-ladder account (no `ladder` key), which sees everything. Drivers that skip the optional questions have no remembered answers; drivers that edit or forget a general memory fact seed `current_focus` first. Native field focus, keyboard and the masked scroll fade need the iOS Simulator; browser runs are not native proof.
