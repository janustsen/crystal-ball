# Crystal Ball UI rules

The supplied 17-screen **Crystal Ball.html** design supersedes A4. Its authority is a warm, dark room, drifting smoke, a gold-glass orb on a brass stand, one typeface for all UI text. Every tab sits in the captain-approved AI-rendered library room (`src/RoomScene.web.tsx`, [motion](motion.md#room)) with the canvas Library artboard's three.js glass ball, drag-to-spin, header and tab bar (`src/Home.tsx`); each tab's existing screen content keeps the 17-screen design. Reusable art is extracted with `scripts/import-design.py`; see [motion](motion.md) for the fog implementation. Fonts and licenses live in assets/fonts/.

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
| All UI text | Cormorant Garamond (regular and italic; `fonts` in `src/ui.tsx`) |

The web app stays centered at a maximum width of 390 px. Content scrolls on smaller screens and at 200% text. Nothing may overflow the shell horizontally at 360–430 px, at either text size; rows let their text column shrink and wrap (`scripts/check-layout.mjs` enforces this). The wordmark and tab labels retain their graphic size; task text scales. Touch targets remain at least 44 pt. Surfaces are rendered, never hand-drawn: every notice, button, input, chip, card, panel, badge, tab bar and sheet draws a material from the modeled component kit (`assets/materials/manifest.json`, the kit's `cb-component-kit.v1` schema, imported by `scripts/import-kit.mjs`) behind its live content, and text on a material with a `text_color` takes that ink (`src/Material.tsx`: 9-slice, shadow outset and caps such as the notice's brass tack). Primary buttons use `brass-button`, secondary buttons `oak-button`, chips `oak-chip`, balance badges `brass-badge`, the omen card, You plan row, recap heads and Sky map `brass-plaque`, cards and history rows `vellum-card`, the check-in card `receipt-card`, notices `parchment-note` (`parchment-note-error` for failures), other panels `modal`, plan options `plan` (selected with its ribbon), fields `input`, the voice control `mic`, the tab bar `tabbar` with `tabslot` and the Ask `cradle`, share actions `sheet` and the story preview `share-frame`. A pressed button's label sinks 2 pt into its pressed art. The [motion language](motion-language.md) owns movement. Smoke and embers are decorative and cannot intercept input. Reduced motion stops the shader animation and CSS motion.

## Navigation and the 17 states

Home, Sky, raised Ask orb, History and You are the five destinations. Every destination sits over its spot in the rendered [room](motion.md#room) with the canvas header and tab bar; its content docks below the spot's focal object when space permits. On short screens, the content moves up to preserve a scroll viewport; notices reserve their own scrollable space, including Dismiss and Undo controls. Main navigation disappears during the reading, plans and sharing; a back/close control remains. Android Back closes the recording replay first, then sharing or plans; within a reading it cancels to typing, then returns Home on the next press. Native keyboard/safe-area behavior still needs a device drive.

1. Home: the room's wide view with the desk ball as the reading's tap target, the reading balance (opens Plans), “What lies ahead?”, the frosted Today’s omen card, the entertainment line and a due-check-in action when applicable; see [motion](motion.md#room).
2. Approach: the room's Ask close-up of the ball and “Come closer…” before voice.
3. Listening: actual voice integration, transcript, confirmation and Type instead. Denied/unavailable speech exposes typing.
4. Typing: the Ask ball above a borderless serif question input, Speak instead and Ask the Ball.
5–7. Follow-ups: the Ask ball above a borderless question; centered, staggered and left-aligned answer arrangements. Each real question uses the next arrangement. Standard answers advance immediately. In my own words opens an editable field and an explicit submit action. Progress uses the actual returned total, not a hardcoded three.
8. Thinking: smoke, status, longer-wait message and Cancel; disclose the [interruption and retry behavior](../../README.md).
9. Reveal: actual engine headline and speculative label; see [Short, personal readings](#short-personal-readings) for Due date and Why disclosure. Share, reminder, another question, edit and current-session answer review remain available. See [README](../../README.md) for saved-reading outcome controls.
10. Share: compact actual export preview and image/friend/reminder actions.
11. Story: full 9:16 preview and 1080×1920 PNG export.
12. Error: retry, retained answers where available, and edit. No fabricated successful output.
13. Sensitive redirect: real engine classification, no new charge or history entry for the blocked attempt; retain the interruption caveat from [user guidance](../../README.md). Self-harm exposes support.
14. Plans: subscription selection per [prototype pricing](../research/pricing.md#paywall-rules-and-test), packs and Restore. Purchase labels follow the [billing mode](../launch/billing.md).
15. Sky: Tonight’s Sky has clearly labeled synthetic samples and approved anonymous Stars; Circles follows the [social visibility and interaction contract](../social/model.md#social-v2).
16. History: date, question, real saved headline and outcome.
17. You: plan balance, editable/forgettable facts, Undo, large text, reduced motion, sound controls, and Forget everything. See [usage](../../README.md) for sound preferences, Plus styles and what Forget everything clears or preserves.

## Behavioral invariants

The real engine still owns cards and predictions. Known facts are skipped; friend readings never teach the owner's memory. Back preserves prior answers and truncates later dependent answers. Invalid Other input cannot advance. Cancel aborts the client request. Failed generation keeps answers; interruption and retry charging follow [user guidance](../../README.md). The decoder still repairs once then fails closed. Do not describe structural correctness as semantic or predictive accuracy.

See [sharing usage](../../README.md) for story-image and recording contents and the headline privacy warning. The share-screen friend link uses a generic question; Sky prompts use approved anonymous wording or labeled samples. Native check-in behavior and its web preview are described in [README](../../README.md); Apple and purchase setup boundaries remain in [SETUP](../../SETUP.md).

## Verification

The project verify-crystal-ball skill owns the executable gate. Current evidence is docs/evidence/design-2026-09-30/, including all 17 screens, actual engine responses, accessibility scans, small-screen/large-text checks and preserved failed rounds. Earlier violet/A4 evidence is historical. Match the exported reference visually while using live data; do not seed personal facts or successful readings merely to reproduce reference copy.

## Short, personal readings

See [usage](../../README.md) for onboarding, age confirmation, Person readings, Due date and Why disclosure, and the [question policy](../research/question-engine.md) for card selection and qualitative forecasts.
