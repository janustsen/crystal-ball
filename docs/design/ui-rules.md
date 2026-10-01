# Crystal Ball UI rules

The supplied 17-screen **Crystal Ball.html** design supersedes A4. Its authority is a warm, dark room, drifting smoke, a gold-glass orb on a brass stand, IM Fell English display type and Hanken Grotesk body type. Home has no explanatory headline or primary button competing with the orb. Reusable art is extracted with `scripts/import-design.py`; see [motion](motion.md) for the fog implementation. Fonts and licenses live in assets/fonts/.

## Palette and composition

| Role | Value |
|---|---|
| Ink / room | #120E0B |
| Warm glow | #281B10 |
| Surface | #1C1510 |
| Tab bar | #0B0806 |
| Primary text | #F1E9DC |
| Secondary text | #B9AB97 |
| Gold / focus | #E0A458 / #F2C284 |
| Borders | #614C34 / #79634A |
| Display / body | IM Fell English / Hanken Grotesk |

The web app stays centered at a maximum width of 390 px. Content scrolls on smaller screens and at 200% text. The wordmark and tab labels retain their graphic size; task text scales. Touch targets remain at least 44 pt. Primary buttons are ivory, secondary actions are plain text or outlined. Smoke and embers are decorative and cannot intercept input. Reduced motion stops the shader animation and CSS motion.

## Navigation and the 17 states

Home, Explore, raised Ask orb, History and You are the five destinations. The tab orb uses exactly the Home orb artwork. Main navigation disappears during the reading, plans and sharing; a back/close control remains. Android Back closes sharing or plans first; within a reading it cancels to typing, then returns Home on the next press. Native keyboard/safe-area behavior still needs a device drive.

1. Home: orb, one italic instruction, Daily omen panel and decorative fog whispers; see [motion](motion.md#orb-delight) for their animation and input behavior.
2. Approach: larger orb and “Come closer…” before voice.
3. Listening: actual voice integration, transcript, confirmation and Type instead. Denied/unavailable speech exposes typing.
4. Typing: smaller orb, borderless serif question input, Speak instead and Ask the Ball.
5–7. Follow-ups: shrinking orb above a borderless question; centered, staggered and left-aligned answer arrangements. Each real question uses the next arrangement. Standard answers advance immediately. In my own words opens an editable field and an explicit submit action. Progress uses the actual returned total, not a hardcoded three.
8. Thinking: smoke, status, longer-wait message and Cancel; no credit is spent yet.
9. Reveal: actual engine headline and speculative label; Why expands actual facts, assumptions and dated source leads. Share, reminder, another question, edit and current-session answer review remain available. See [README](../../README.md) for saved-reading outcome controls.
10. Share: compact actual export preview and image/video/friend/reminder actions.
11. Story: full 9:16 preview and 1080×1920 PNG export.
12. Error: retry, retained answers where available, and edit. No fabricated successful output.
13. Sensitive redirect: real engine classification, no credit spent or history entry; self-harm exposes support.
14. Plans: yearly/monthly selection, packs and Restore. All purchases explicitly say test/simulate; no real money moves.
15. Explore: illustrated collections and labeled example readings.
16. History: date, question, real saved headline and outcome.
17. You: plan balance, editable/forgettable facts, Undo, large text, reduced motion, sound and style controls, and Forget everything. See [usage](../../README.md) for sound preferences and Plus styles. Forget everything removes readings/facts while preserving plan and credit accounting.

## Behavioral invariants

The real engine still owns cards and predictions. Known facts are skipped; friend readings never teach the owner's memory. Back preserves prior answers and truncates later dependent answers. Invalid Other input cannot advance. Cancel aborts the request. Failed generation keeps answers and spends no reading. The decoder still repairs once then fails closed. Do not describe structural correctness as semantic or predictive accuracy.

The story image includes the headline, speculative label and branding, never private questions, answers or Why. The share-screen friend link uses a generic question; Explore links use the selected public prompt. Story video needs ffmpeg and exposes a recoverable error if it is absent. Native check-in behavior and its web preview are described in [README](../../README.md); Apple and purchase setup boundaries remain in [SETUP](../../SETUP.md).

## Verification

The project verify-crystal-ball skill owns the executable gate. Current evidence is docs/evidence/design-2026-09-30/, including all 17 screens, actual engine responses, accessibility scans, small-screen/large-text checks and preserved failed rounds. Earlier violet/A4 evidence is historical. Match the exported reference visually while using live data; do not seed personal facts or successful readings merely to reproduce reference copy.
