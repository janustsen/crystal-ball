# Crystal Ball UI rules

The selected [Apothecary thesis](../design-thesis.md) supersedes the supplied 17-screen reference, Open mist and Fraunces/Manrope. The ball belongs in a painted witch’s house, with a table, room reflections and warm light. Use IM Fell English SC headings, Caudex body text and the protected IM Fell English Italic wordmark. Keep copy brief and centered; omen and forecast explanations may run longer. Fonts and licenses live in assets/fonts/.

## Palette and composition

| Role | Value |
|---|---|
| Ink / room | #120E0B |
| Warm glow | #281B10 |
| Surface | #1C1510 |
| Tab bar | See navigation styling in `app/index.tsx` |
| Primary text | #F1E9DC |
| Secondary text | `colors.muted` in `src/ui.tsx` |
| Gold / focus | `colors.gold` / `colors.ice` in `src/ui.tsx` |
| Borders | #614C34 / #79634A |
| Display / body | IM Fell English SC / Caudex; wordmark IM Fell English Italic |

The web app stays centered at a maximum width of 430 px. Content scrolls on smaller screens and at 200% text. Nothing may overflow the shell horizontally at 360–430 px, at either text size; rows let their text column shrink and wrap (`scripts/check-layout.mjs` enforces this). The wordmark retains its graphic size; task text and tab labels scale. Footer height is measured so enlarged navigation stays clear of scrolling content and the raised Ask orb. Touch targets remain at least 44 pt. Use textured wood for primary actions, writing paper for fields and irregular illustrated parchment for choices and information. Center labels, choices and text. Avoid machine-cut cards and fine straight dividers. Long multiline fields expose a persistent scroll-position cue. The ball and room share illustrated depth; the question sits on a parchment slip below the ball. Utility-screen atmosphere is dimmed behind readable content. Smoke and decoration cannot intercept input. Reduced motion stops painted smoke, camera movement and CSS animation; see [motion](motion.md).

## Navigation and the 17 states

Home, Sky, raised Ask orb, History and You are the five destinations. The tab orb uses exactly the Home orb artwork. Main navigation disappears during the reading, plans and sharing; a back/close control remains. Android Back closes the recording replay first, then sharing or plans; within a reading it cancels to typing, then returns Home on the next press. Native keyboard/safe-area behavior still needs a device drive.

1. Home: painted ball on its table, a parchment question, due-check-in action and Daily omen. Shelf, hearth and cabinet objects open History, Circles and plans.
2. Approach: orb and “Your question.” with explicit Type a question and Speak a question controls.
3. Listening: actual voice integration, transcript, confirmation and Type instead. Denied/unavailable speech exposes typing.
4. Typing: paper question input, Speak instead and Ask the Ball. Configured AI providers require a separate explicit consent review before sending; the draft is retained.
5–7. Follow-ups: small decorative orb above a centered question, with parchment choices. At 200% text, decorative orbs in forms are omitted and plan pricing stacks; Home retains its full hero. Custom entry collapses unused choices and offers a visible way back to them. Standard answers select without advancing under either motion preference; Continue or Reveal commits once. In my own words opens an editable field and an explicit submit action. Progress uses the actual returned total, not a hardcoded three.
8. Thinking: smoke, status, longer-wait message and Cancel; no credit is spent yet.
9. Reveal: actual engine headline and speculative label; see [Short, personal readings](#short-personal-readings) for Due date and Why disclosure. Why and Share remain visible; More actions groups reminder, another question, edit and current-session answer review. At zero balance, the next-reading action opens plans. See [README](../../README.md) for saved-reading outcome controls.
10. Share: compact actual export preview and image/friend/reminder actions.
11. Story: full 9:16 preview and 1080×1920 PNG export.
12. Error: retry, retained answers where available, and edit. No fabricated successful output.
13. Sensitive redirect: real engine classification, no credit spent or history entry; self-harm exposes support.
14. Plans: subscription selection per [prototype pricing](../research/pricing.md#paywall-rules-and-test), packs and Restore. All purchases explicitly say test/simulate; no real money moves.
15. Sky: Tonight’s Sky has clearly labeled synthetic samples and approved anonymous Stars; Circles follows the [social visibility and interaction contract](../social/model.md#social-v2).
16. History: date, real saved headline and outcome on shelf summaries; opening a record exposes the check-in and an Original question disclosure.
17. You: plan balance, editable/forgettable facts, Undo, large text, reduced motion, sound and style controls, and Forget everything. See [usage](../../README.md) for sound preferences, Plus styles and what Forget everything clears or preserves.

## Behavioral invariants

The real engine still owns cards and predictions. Known facts are skipped; friend readings never teach the owner's memory. Back preserves prior answers and truncates later dependent answers. Invalid Other input cannot advance. Cancel aborts the request. Failed generation keeps answers and spends no reading. The decoder still repairs once then fails closed. Do not describe structural correctness as semantic or predictive accuracy.

Share leads with a tappable artifact preview, primary image action and visible privacy copy. Invite & remind discloses secondary tools. Export, invitation and reminder feedback opens a scrollable result sheet; dismiss Done before using underlying controls. See [sharing usage](../../README.md) for story-image and recording contents and the headline privacy warning. The share-screen friend link uses a generic question; Sky prompts use approved anonymous wording or labeled samples. Native check-in behavior and its web preview are described in [README](../../README.md); Apple and purchase setup boundaries remain in [SETUP](../../SETUP.md).

## Verification

The project verify-crystal-ball skill owns the executable gate. Current design acceptance is recorded in docs/ux-loop/final-scores.md; earlier 17-screen, violet/A4 and Open mist captures are historical. Follow the Apothecary thesis while using live data; do not seed personal facts or successful readings merely to reproduce reference copy.

## Short, personal readings

See [usage](../../README.md) for onboarding, age confirmation, Person readings, Due date and Why disclosure, and the [question policy](../research/question-engine.md) for card selection and qualitative forecasts.
