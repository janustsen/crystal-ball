# UI rules for every Crystal Ball change

Thesis: a pocket observatory. Ink-violet space, a luminous glass sphere, gold celestial marks and calm book-like typography. The sphere is the memorable object; surrounding controls stay quiet and readable.

1. Use #0B0620 to #2A1458 background, #A77BFF and #5CE1E6 orb light, #F5C76B for emphasis. Text ivory #F7F1FF, secondary #C4B8D8. No low-opacity body copy.
2. Display serif / interface sans pairing. Body and inputs >=16, metadata >=12. Text scales and wraps; no fixed-height text cards. 24 pt page inset and 8 pt spacing rhythm.
3. Bottom destinations: Home, Explore, raised Ask orb, History, You. Each has a text label and >=44 pt target. Respect bottom safe area. Ask supports Back without losing the current card's answer.
4. One question/card. Always provide Other with an editable field. Confirm with a separate button to avoid accidental advance. Show count and “Getting to know you”; do not fake a fixed denominator in an adaptive flow.
5. Answer first, why second. Headline <=110 characters; don't hide a paragraph in the ball. A persistent “Forecast, not a guarantee” label contextualizes the oracle voice. Sources and assumptions are visible on expansion.
6. Animate only orb breath/mist (slow), selection response (140 ms) and reveal (600 ms). Honor system reduced motion and a visible motion toggle. No flashing or forced wait after work finishes.
7. All tappable icons have accessible names. Visible labels for inputs, selected/disabled states for options, error/live-status announcements. Keyboard can complete the web verification flow. Never disable zoom.
8. Empty History offers a first question; failed generation retains answers and a retry; safety redirects offer a safe suggested question. Cancellation leaves no fake prediction or spent credit.
9. Sharing preview is private by default: only forecast and public-friendly question, no facts, full name or user identifier. Show preview before system share/export. 1080×1920 composition with key content within central safe region, still alternative to animation.
10. Paywall shows actual price/period/cap, close, restore and test-mode status. No fake discounts, audience counts, urgency or claim that a forecast is scientifically proven.

Temporary sources and popularity evidence: ../research/ui-skills.md. These rules supersede generic remote-skill color or layout recommendations.

## Mobile edge states

KeyboardAvoidingView keeps the ask/Other input and confirmation action visible; the content remains scrollable. Android back returns to the previous card or closes an overlay before leaving the tab; an active request can be cancelled. Safe-area insets include Android navigation bars as well as iOS home indicators. Voice permission is requested only on the first deliberate microphone action; denial retains typing and suggests OS dictation. Never request location/contacts.

Text scaling is not disabled or capped: test 200% on the phone viewport; headings wrap and the orb headline can move beneath the orb when necessary. The orb has a dark center scrim for text, so text is never laid directly over cyan/purple highlights. Loading shows the actual current operation immediately, adds “Still looking. You can leave and try again” after 8 seconds, and times out with retry and retained answers at 60 seconds. No fictional source counters. These initial UX thresholds are budgets, not measured end-to-end performance.

Measured WCAG contrast pairs are in contrast.json (sRGB relative luminance): ivory 17.89:1 on ink, 14.17:1 on violet; secondary 10.55:1 / 8.36:1; gold 12.50:1 / 9.90:1. Ivory on the opaque orb-text scrim #160F30 is 16.58:1. Glow colors are decorative, not text backgrounds. Buttons use ink text on the gold fill. These ratios must be rechecked if tokens or opacity change.

## Concrete small-screen and disclosure decisions
At 375×667, reserve bottom 84pt for navigation including inset and top 56pt for heading. The remaining 527pt is a scrollable content viewport, never an absolute-positioned card stack. Orb shrinks from 240 to 160pt before text shrinks. Reveal headline, forecast label, Why, and primary action remain in document order. At 200% text, orb becomes a decorative 96pt thumbnail and all content scrolls; no line clamps. Five fixed tab slots retain one-line labels at standard size, with accessible full names and native large-content-viewer support where available; active screen heading scales. Web has accessible button names and browser zoom. Native accessibility still requires a device check.

Cards use selection then Next: two taps per standard card, at most twenty for ten cards. This favors correcting a choice before committing learned facts; no auto-advance. Hypothesis: ten cards take ≤180s; test against auto-advance only if 2/5 usability participants stumble on Next. Other always requires explicit confirmation. Progress says “Getting to know you” plus card count so an adaptive cap is never promised as a fixed count.

Why expands inline below the prediction, using an accessible expanded state. Focus stays on the toggle; announce “Explanation expanded”; the next reading item is the explanation heading. Back preserves reveal, and toggling again collapses. Avoid a nested modal and its focus trap. Explore contains visibly seeded community-style prompts by topic, without fabricated live user counts. You contains editable remembered facts, privacy/reset, reduced motion, account save, and mock plan access.

Share layout: 1080×1920, with critical text inside x=90…990 and y=300…1500. The outer 300px top and 420px bottom hold decoration only, a conservative proposed overlay allowance rather than a universal platform guarantee. Preview must show that friends cannot see private inputs or Why. The exported artifact retains its speculative-forecast label.
