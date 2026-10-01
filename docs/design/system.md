# Crystal Ball design system

Follow [UI rules](ui-rules.md) for the current art direction, accessibility and interaction authority. Fortune-telling theater belongs in the mist and reveal, while actions and explanations stay plain.

## Tokens and typography
See [UI rules](ui-rules.md#palette-and-composition) for palette, typography, sizing and composition. Component dimensions are implemented in `src/ui.tsx`; text must remain clear of the brightest mist.

## Composition alternatives reviewed
The earlier observatory composition is superseded by the supplied design; see [UI rules](ui-rules.md) for the current direction and screen compositions.

## Motion
See [motion.md](motion.md) for motion and the web/native artwork boundary.

## Components
See [UI rules](ui-rules.md#navigation-and-the-17-states) for the current components and screen behavior, and its [behavioral invariants](ui-rules.md#behavioral-invariants) for memory, recovery and sharing boundaries.

## Screen constraints

No sign-up gate. See [UI rules](ui-rules.md#navigation-and-the-17-states) for Sky navigation. Knowledge facts retain human labels, editable values and deletion. Friends' facts never enter the owner's knowledge.

Paywall: Free 1/day; Plus $5.99/month or $39.99/year (10/day), packs 5/$1.99 and 20/$5.99. Billing period must remain clear alongside price, with no fake urgency. Simulated purchases take no money; Restore must tell the truth about mock state.

## States and verification
Reading generation has loading, timeout, retry and cancel; facts load before Ask becomes available. Daily omen availability follows the [daily generation policy](../../SETUP.md#daily-omen-widget-and-check-ins). Empty/offline screens remain usable. 375×667 and 390×844, browser zoom 200%, keyboard open, and reduced motion are required checks. Native Dynamic Type, VoiceOver, Apple auth, notifications and purchases remain device validation items until Xcode/accounts exist. Verify each tab, a complete flow, a blocked flow, returning known facts, share export and mock paywall with the project verification skill.

## Rendered review and component states

See [current verification evidence](../evidence/design-2026-09-30/README.md) for captures of the replacement design and platform limits. Earlier violet captures are historical.

[UI rules](ui-rules.md) owns component appearance and interaction; [motion](motion.md) owns orb and entrance states. Preserve these accessibility constraints:

- Actions expose full accessible labels and cannot fire while disabled.
- Inputs keep visible labels, distinguish placeholders from values and never clamp task text.
- Why retains focus on its toggle and announces expanded/collapsed state.
- Notices announce politely and scroll independently without hiding navigation.
- Back closes the paywall; Restore remains in its scroll area.

## Voice and copy

Oracle headlines are direct: “Your project will reach 108 users in 4 weeks.” Explanations separate supplied facts from assumptions. Interface copy is plain: “Your question”, “Review answers”, “Nothing was charged.” Recovery keeps the metaphor short: “The Ball took too long.” Avoid repeated diminutives, mock urgency and claims of supernatural accuracy. The brand wordmark stays a compact graphic at large text; navigation accessible names and all task content remain available.

## Semantic visual roles

Task headings remain scalable; see [UI rules](ui-rules.md#palette-and-composition) for graphic-size exceptions. History outcomes must remain explicit text, never color alone.

Headline patterns: yes/no → “You will finish your draft this year”; number → “Your net worth will be $106,413 in 10 years”; named outcome → “Argentina will win the 2030 Men’s World Cup”; skill → “You will speak basic Danish in 6 months.” Avoid “Maybe things will improve,” invented odds, and a because-clause in the headline. Why owns assumptions and reasoning. Negative verdicts remain direct and kind.
