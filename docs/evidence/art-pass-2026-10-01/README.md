# Art and motion pass, 2026-10-01

Evidence for the illustrated depth, faster orb mist, tap feedback and named transitions described in [the motion language](../../design/motion-language.md), plus the two captain-reported overflow bugs. Browser checks ran at 390×844 against a local preview on this iMac with the real local Ollama engine. They prove layout, frame cadence and reduced-motion behavior, not predictive accuracy.

## Overflow bugs (captain screenshots)

`captain-paywall-overflow-before.png` and `captain-you-overflow-before.png` show the plan prices and the plans link pushed past the shell at 200% text. Cause: React Native row children default to `flexShrink: 0`, so the long text column never wrapped. Fixed by letting the text column shrink. `scripts/check-layout.mjs` covers all 17 design screens through 24 states and variants at 360, 390 and 430 px, at normal and 200% text. It asserts a screen-specific marker before measuring horizontal bounds. The focused review rerun against this worktree’s localhost:8097 preview produced 144 passing checks and zero overflow failures in `layout-after-fix.json`. Coverage includes all three answer arrangements, Other, held planning and research responses, errors and sensitive redirects from both request stages, expanded Why, Story, empty/filled History and check-in. Approach is measured while “Come closer…” is present, without the ordinary settling delay. Engine replies are explicitly synthetic layout fixtures, not model evidence. Before the layout fix, You and Plans failed at all three widths. `screen-paywall.png` and `screen-paywall-large.png` are refreshed 390 px captures with both yearly/monthly cards fully in view; the other `screen-*.png` captures remain from the original art pass.

## Frame cadence

Final `scripts/drive-motion.mjs` run (`motion/`, host load average about 15):

| Sample | fps | fog draws/s | p95 ms | max ms | long tasks ms |
|---|---|---|---|---|---|
| idle-both-orbs | 60.2 | 60.2 | 16.7 | 16.8 | – |
| orb-approach-listening | 60.1 | 60.1 | 16.7 | 16.8 | – |
| listening | 60.0 | 60.0 | 16.7 | 16.8 | – |
| typing | 60.1 | 60.1 | 16.8 | 16.8 | – |
| planning-to-question-one | 59.0 | 59.0 | 16.7 | 66.6 | 73 |
| question-two | 60.1 | 60.1 | 16.8 | 16.8 | – |
| question-three | 60.1 | 60.1 | 16.7 | 16.8 | – |
| thinking-to-reveal | 59.9 | 59.9 | 16.8 | 33.3 | – |
| share | 59.2 | 59.2 | 16.8 | 33.2 | – |
| return-reveal | 60.1 | 60.1 | 16.8 | 16.8 | – |
| return-home | 59.8 | 59.8 | 16.8 | 25.3 | – |
| sky-tab | 60.1 | 60.1 | 16.8 | 16.8 | – |
| history-tab | 60.1 | 60.1 | 16.8 | 16.8 | – |
| you-tab | 60.1 | 60.1 | 16.8 | 16.8 | – |
| ask-tab | 60.1 | 60.1 | 16.8 | 16.8 | – |
| close-flow | 60.2 | 60.2 | 16.8 | 16.8 | – |
| ambient-sky | 60.0 | 60.0 | 16.7 | 33.3 | – |

The only budget miss, planning-to-question-one, also fails on main: the same drive on origin/main measured 59.3 fps, max 50.0 ms and a 54 ms long task. In six fixture runs the question-screen mount produced a 50–70 ms long task about one time in three. It is a React render of the first question, not one of the new animations.

Regressions found and fixed during this pass, kept here as failures:

- The orb portal first animated a clip-path. Its first frame took 383–467 ms (27–47 fps). A scaled radial iris layer replaced it, and approach now holds 59.6–60.1 fps.
- Blurred panel shadows made the first Sky paint take 267–333 ms in traced runs. Hard shadows brought sky-tab back to 60.1 fps with a 16.8 ms max.
- Scaling the share card while dealing it cost one frame of up to 416 ms. Translate and rotate alone give 59.2 fps with a 33.2 ms max.
- Removing tap-spark nodes woke one fog redraw while motion was reduced. The fog's mutation observer now ignores the tap layer.

## Host load and A/B

Other lanes kept the host load average between 50 and 250 for most of this pass. `scripts/ab-motion.mjs` loads the same build in alternating runs, with and without the art-pass transitions, veils, float and tap effects disabled by injected CSS, so both variants share the load. At load averages between 45 and 160, three rounds matched within noise (for example, reveal 59.5–60.2 fps for art against 60.0–60.2 for plain). Large share spikes hit both variants. Five same-tab pointer taps with squash and sparks measured 59.3–59.7 fps with a 33 ms max; without them, 59.7–60.1 fps.

At load average 236 the reduced-motion check saw only 9–17 fog draws in the 500 ms after resuming, where it expects at least 29. At load average 37 the same check passed: reduced motion stops drawing and CSS animation, motion resumes, large text keeps both orbs visible, and the approach delay is skipped (`reduced-motion.json`).

## Boundaries

Native changes (Enter flip and spring, orb outline and highlight, button lip, panel and chip shadows) compile into an iOS Hermes bundle (`npx expo export --platform ios`: 1580 modules). That proves compilation, not device frame rate or native boxShadow rendering. A device trace is still needed. Web tap sparks and the parallax pointer layer have no native equivalent; native taps keep the button lip press and the orb scale.
