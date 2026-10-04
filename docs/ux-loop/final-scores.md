# UX loop: final scores and known gaps

The captain accepted the result at round58 ("Accept ~8.9 and ship it") after the loop plateaued.

Two independent read-only graders scored every screen and shared component on six dimensions (hierarchy, typography, surfaces, clarity, feedback, accessibility) from frozen browser captures at 360/390/430px, normal and 200% text, plus transition filmstrips. Per-item values below are the mean of an item's dimensions.

| round | lowest item | median item | items >=9 on every dimension | items with surfaces <9 |
|---|---|---|---|---|
| 50 | 6.17 | 8.67 | 5/192 | 184/192 |
| 51 | 8.08 | 8.75 | 3/195 | 183/195 |
| 52 | 8.00 | 8.83 | 0/196 | 195/196 |
| 53 | 8.00 | 8.83 | 11/198 | 162/198 |
| 54 | 8.38 | 8.95 | 2/196 | 182/196 |
| 55 | 8.38 | 8.90 | 0/200 | 199/200 |
| 56 | 8.13 | 8.92 | 1/178 | 176/178 |
| 57 | 8.08 | 8.77 | 0/183 | 182/183 |
| 58 | 8.17 | 8.87 | 0/191 | 186/191 |

Final (round58): median item 8.87 (grader summary median 8.83), lowest item 8.17, no item at >=9 on every dimension from both graders. The 9/10-everywhere target was not reached.

## Known gaps

- Surfaces / painted-art integration: parchment and wood panels still read as layered over the painting rather than painted into it. This capped surfaces below 9 on about 186/191 items every round despite edge, mounting, lighting and crossfade passes (expansion-52, expansion-54, round57-58).
- Long-form reading typography under the owner's centered-text constraint, especially the dense stress states.
- Room transitions still read as backdrop changes rather than continuous movement between spaces.
- Enlarged (200%) layouts remain tall on context, check-in, plans and invitation screens.

## Evidence boundary

All scores and checks are browser evaluations of the Expo web preview. Physical iPhone checks (VoiceOver, native keyboard, native sharing and frame rate) are not done and remain a later item. Structural and visual checks do not establish forecast accuracy.

Round evidence and grader outputs: docs/ux-loop/round-NN/ (runtime.md, grader-a.json, grader-b.json, sheets/).
