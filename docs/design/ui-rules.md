# UI rules for every Crystal Ball change

The thesis is a pocket observatory: one luminous glass orb, ink-violet space, gold celestial marks and book-like typography. Temporary skill sources and popularity evidence are in [ui-skills.md](../research/ui-skills.md); none was installed. These product rules take precedence over generic palettes.

## Tokens

| Token / role | Value |
|---|---|
| Ink / page ends | #0B0620 |
| Violet / page midpoint | #2A1458 |
| Surface / panel, field, opaque text protection | #160F30 |
| Secondary action | #25193F; border #66537F |
| Selected choice | #25384B; cyan outline |
| Disabled action | #322541; border #766487; secondary text |
| Tab bar | #100923; border #493460 |
| Field border / placeholder | #685281 / #A89AB8 |
| Panel border / list divider | #3F2D5C / #514069 |
| Choice border / progress line | #5A4473 / #75608C |
| Ivory / primary text | #F7F1FF |
| Secondary text | #C4B8D8 |
| Gold / primary action, settled reveal | #F5C76B |
| Cyan / focus, links, selection, research | #5CE1E6 |
| Lavender / glow | #A77BFF |
| Display / body / metadata | Cormorant Garamond 500 36/40; DM Sans 16/24; DM Sans 13/19 |
| Space / page inset | 8, 12, 16, 24, 32 pt / 24 pt |
| Radius / target | Fields and buttons 16, panels 22; actions ≥52, other touch targets ≥44 pt |

`contrast.json` measures text and non-text pairs using sRGB luminance. Ivory on ink/violet is 17.89/14.17:1; secondary text 10.55/8.36:1; gold 12.50/9.90:1. Text never crosses the bright orb halo. Gold buttons use ink text. Recalculate affected pairs if color or opacity changes. Error copy uses ivory; destructive intent is communicated in words and confirmation, not red alone.

## Navigation and layout

Five fixed destinations: Home, Explore, raised Ask orb, History, You. Standard outline icons mean house, compass, clock and person. Text labels appear at standard size; 200% mode retains these same icons and full accessible names. The wordmark is a compact orb plus serif name. Its graphic size stays fixed; task text scales.

The content viewport ends above the raised Ask button. Reserve 94 pt plus max(bottom safe-area inset, 12 pt), and use actual platform insets. Padding alone must not let text pass beneath navigation. Content scrolls on small screens; no fixed-height text cards. Android Back closes an overlay or returns through the flow before leaving the tab. Native back/keyboard behavior still needs a device drive.

At 200% app text, all task text doubles and wraps without clamps; the decorative orb shrinks to 96 pt. The speculative label precedes the long headline, and Home offers an early Ask action so the task stays discoverable. This deliberately favors full text scaling over a smaller display-font ceiling. VoiceOver, Dynamic Type and native icon-label discovery remain device checks.

## Ask and questions

Typed input has a visible label, suggestions and hold-to-speak. Request microphone access only on deliberate use; denied/unavailable voice retains typing. Never request contacts or location.

Show one card at a time, Other with a visible editable field, then a separate Next. Selected radio state has a star and outline as well as color. Empty Other disables Next. On web, focus scrolls Other into view; native keyboard insets are configured but unverified. Back restores the prior choice and truncates later dependent answers. Known durable inputs are skipped; every plan still has 3–10 cards.

Progress states the actual card number and returned total. The small progress constellation has one point per card; it is unrelated to the fixed five-point brand constellation in the reveal. Two standard taps per card means up to twenty for ten cards. The ≤180-second ten-card burden target is a hypothesis for user testing, not a measured human result.

## Reveal, recovery and memory

Show one definitive headline, ≤110 characters, below the orb. Keep numbers and time units together. Show “Speculative forecast · not a guarantee” with the answer; sharing may split these words across two lines. Why expands inline with an expanded state, retained toggle focus and announcement, followed by facts, assumptions and dated source leads. Sources never imply proof of the future.

Share is the primary reveal action; Remind me and Ask again are lighter links. Outcome marking appears when reopening a prediction from History, not on the fresh reveal. History uses an orb thumbnail and explicit pending/yes/no status text. Dates use abbreviated month, day and year in the device locale.

You lets people edit and forget facts. Forget offers Undo until navigation; Reset confirms the whole-data deletion. Friend readings never teach the owner's bank. Empty states explain the next action. Failed generation retains answers and spends no reading. Sensitive redirects offer a hopeful alternative and Edit question; self-harm also exposes support. Notice takes layout space and has Dismiss.

## Share and commerce

Export the actual preview composition as 1080×1920 PNG or a four-second MP4. Only headline, date and branding appear; no private question, facts or Why. Critical text stays within x=90–990, y=300–1500. Star field and a closing constellation occupy decorative outer bands. The speculative label uses two large lines to remain readable in the compact preview.

The paywall shows price, billing period, allowance, close, restore and explicit test-mode labels. Mock actions never charge. Annual pricing is retained only for prototype review and is not approved for production activation. No fake urgency, popularity or scientifically proven accuracy.

## Sources, budgets and proof

[WCAG resizing](https://www.w3.org/WAI/WCAG21/Understanding/resize-text) supports 200% text without lost functionality. [WCAG 2.2](https://www.w3.org/TR/wcag/) defines target-size and reflow requirements; 44 pt is our conservative touch target, not a claim about its AA minimum. [Android inset guidance](https://developer.android.com/design/ui/mobile/guides/layout-and-content/edge-to-edge?hl=en) supports keeping text and controls clear of system bars.

Orb sizes, custom bar dimensions and card-time budgets are project hypotheses, not platform prescriptions. The 8-second longer-wait message precedes [NN/g's roughly ten-second attention limit](https://www.nngroup.com/videos/3-response-time-limits-interaction-design/); the 60-second timeout is an engineering recovery limit. No verified universal organic Instagram/TikTok overlay standard was found: safe bands are conservative proposals requiring actual destination previews before release.

[motion.md](motion.md) owns all animation values. [review.html](review.html) indexes actual captures, videos and unresolved device checks. The project verification skill owns the executable drive; historical failures remain evidence, not current acceptance captures.
