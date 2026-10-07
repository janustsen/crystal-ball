# Crystal Ball UI rules

The captain's Claude Design canvas **Sky & History — UI refresh** (Sky and History artboards) is the visual authority: clean and modern (Calm, Airbnb, Spotify), and every screen plainly says what it does. It replaces the modeled walnut/brass component kit, room lighting, desk reply card and skylight star map. Every tab shows its spot's still from the library room (`src/RoomScene.web.tsx`, [motion](motion.md#room)) as its hero, fading to the ground (the 9:19.5 renders fill a 390×844 screen exactly as the reference's top-anchored backdrop; shorter screens crop evenly so the desk ball stays clear); the live glass ball stays where the room shows it (Home and Ask). Fonts and licenses live in assets/fonts/.

## Palette and composition

| Role | Value |
|---|---|
| Ground | #140E0A |
| Ink (primary text) | #F4EBDD |
| Secondary text | #DCCFBA |
| Label | #CDB98F |
| Inactive (tab bar) | #A8987F |
| Accent gold / text on gold | #E3C78F / #20160F |
| Glass card | rgba(22,15,11,.58–.62), 18 px backdrop blur, 1 px rgba(227,199,143,.22) border, 22 px radius |
| Display | Cormorant Garamond: italic 36 px screen titles, 24–46 px headings, copy and buttons |
| UI | Jost: labels 11 px, 0.14 em, uppercase; pills, captions and tab labels |

`src/ui.tsx` owns the tokens and primitives and `src/Surface.tsx` the surfaces: glass `card` (and `error`), `row` buttons and `input` fields at 14 px radius, `chip` and `pill` at 999 px, and the gold `primary` pill for a screen's one main action; a selected chip or segment fills gold, a selected card takes a gold outline. Every tab shares the header (italic title, top-right glass readings-left pill that opens Plans) and the floating glass tab bar (14 px inset, 68 px, 26 px radius) with the reference's Home, Sky, History and You line icons and the raised gold ball for Ask. Rows that go somewhere use `RowLink` (label, optional detail, gold chevron); cards open with `CardHeader` (display title, label on the right). Text sits on glass or on the ground: the room fades to the ground behind each screen's content (more strongly in the reading and overlays), and the few labels set directly on the room photo take `styles.overRoom`'s soft shadow.

The web app stays centered at a maximum width of 390 px. Content scrolls on smaller screens and at 200% text, and softens into the room as it scrolls up. Nothing may overflow the shell horizontally at 360–430 px, at either text size; rows let their text column shrink and wrap (`scripts/check-layout.mjs` enforces this). Screen titles, the wordmark and tab labels retain their graphic size; task text scales. Touch targets remain at least 44 pt. `scripts/check-layout.mjs` measures every visible label against what is rendered behind it (WCAG AA: 4.5:1, 3:1 for large text). While listening, a notice never lifts the title over the ball. The [motion language](motion-language.md) owns movement. Smoke and embers are decorative and cannot intercept input. Reduced motion stops the shader animation and CSS motion.

## Navigation and the 17 states

Home, Sky, raised Ask orb, History and You are the five destinations. Every destination sits over its spot's room still with the shared header and tab bar; its content docks below the spot's focal object when space permits. On short screens, the content moves up to preserve a scroll viewport; notices reserve their own scrollable space, including Dismiss and Undo controls. Main navigation disappears during the reading, plans and sharing; a back/close control remains. Android Back closes the recording replay first, then sharing or plans; within a reading it cancels to typing, then returns Home on the next press. Native keyboard/safe-area behavior still needs a device drive.

1. Home: the room's wide view with the desk ball as the reading's tap target, the reading balance (opens Plans), “What lies ahead?”, the Today’s omen card, the entertainment line and a due-check-in action when applicable; see [motion](motion.md#room).
2. Approach: the room's Ask close-up of the ball and “Come closer…” before voice.
3. Listening: actual voice integration, transcript, confirmation and Type instead. Denied/unavailable speech exposes typing.
4. Typing: the Ask ball above a glass serif question field, Speak instead and the gold Ask the Ball action.
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

The project verify-crystal-ball skill owns the executable gate. Current evidence is docs/evidence/design-2026-09-30/, including all 17 screens, actual engine responses, accessibility scans, small-screen/large-text checks and preserved failed rounds. Earlier violet/A4 and modeled-kit evidence is historical. Match the exported reference visually while using live data; do not seed personal facts or successful readings merely to reproduce reference copy.

## Short, personal readings

See [usage](../../README.md) for onboarding, age confirmation, Person readings, Due date and Why disclosure, and the [question policy](../research/question-engine.md) for card selection and qualitative forecasts.
