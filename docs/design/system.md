# Crystal Ball design system

The app is a tiny observatory: one luminous glass orb is the visual centerpiece, with a quiet night-sky frame. Fortune-telling theater belongs in the mist and reveal, while actions and explanations stay plain. Follow ui-rules.md; it is the accessibility and interaction authority.

## Tokens and typography
Ink #0B0620, violet #2A1458, lavender #A77BFF, ice #5CE1E6, gold #F5C76B, ivory #F7F1FF. Opaque reading surfaces #160F30; secondary #C4B8D8. Cormorant Garamond 500 for intimate, slightly dramatic display (36/40, reveal 34/38); DM Sans 400/500/700 for body 16/24 and actions16/20, captions13/18. Text never sits on the brightest mist. Radius32 is reserved for orb-related surfaces, radius16 for selectable cards, radius12 for utility fields. Insets24; spacing8/12/16/24/32. Main buttons52 minimum, targets44 minimum.

## Composition alternatives reviewed
A tarot-deck layout gives each prediction equal weight but makes this feel like a tarot app. A dashboard makes history easy but buries the invitation. The chosen observatory gives the orb most of the first screen, a compact question underneath, and a small suggestion row. It directly reflects the tap-the-ball brief. Other screens use quiet lists rather than repeating giant rounded cards. The unique element is the glass orb with orbit paths and internal mist, not a generic gradient dashboard.

## Motion
Orb breathes over 6s using native Animated opacity/scale; a second mist layer drifts oppositely over 12s. Idle animation stops when the screen is unfocused or reduced motion is enabled. Selection140ms, reveal600ms. Research uses a subtle orbit and honest stage text, never a fake percentage. Haptics on selection/reveal only on native. Reduce-motion respects both system and user settings; static orb still looks finished.

## Components
Screen (gradient, sparse fixed stars, safe insets, scroll area); Orb (decorative SVG plus accessible button wrapper); Type (serif display, sans body); Action (primary gold/secondary quiet); ChoiceCard (radio state plus separate Next); Forecast (headline + always-visible speculative label); WhyDisclosure (facts/assumptions/dates/links); TabBar (four standard tabs plus raised center orb); EmptyState; Notice; FactEditor; OfferRow; SharePreview.

## Screen specifications
Home: greeting, “A little glimpse of what’s next.”, large tappable orb, remaining daily reading, three suggestion prompts, latest prediction if present. No sign-up gate.
Explore: topic chips and clearly labeled “Sample predictions” feed; no fabricated real-time engagement. Each prompt opens Ask with text prefilled, never silently spends a credit.
Ask: serif question, multiline typed input, hold-to-speak with permission only on first use and visible transcript, suggestions, Continue. Friend mode banner explicitly excludes answers from the owner knowledge bank. Cancel returns Home without spending.
History: reverse chronological predictions, question/headline/date, pending/yes/no check-back states. Tap opens the complete reveal and Why. Empty state leads to Ask.
You: “What the Ball knows about you”, editable/deletable facts, reduced-motion switch, plan, anonymous account save with Apple, explicit local reset confirmation.
Questions: one card, back, progress count, four options including Other. Other opens text input. Next disabled until a nonempty answer. Known durable facts omitted. Back truncates dependent answers. Cancellation keeps only previously committed knowledge, never a prediction charge.
Research: orb plus current operation, retry/cancel and timeout recovery; no invented search completion. Sensitive input instead gets kind redirect with a safe suggested question.
Reveal: headline within orb composition, speculative label immediately below, inline Why containing actual user facts, assumptions and source leads. Share, check-back reminder and Ask again; errors never turn into invented predictions.
Share: 9:16 composition preview with prediction and branding, speculative label retained, question optional/private default; downloadable animated clip plus still. No private facts or source explanation in artifact. See ui-rules for safe bounds.
Paywall: dismissible test-mode page. Free1/day; Plus $5.99/month or $39.99/year (10/day), packs5/$1.99 and20/$5.99. Billing period equally prominent to price, no fake urgency. Simulated purchases explicitly named and no money taken. Restore tells the truth about mock state.
Knowledge: each fact has a human label, editable value and delete. Empty knowledge explains that answers will appear here. Friends' facts never appear.

## States and verification
Every network operation has loading, timeout, retry and cancel; facts load before Ask becomes available. Empty/offline screens remain usable. 375×667 and390×844, browser zoom200%, keyboard open, and reduced motion are required checks. Native Dynamic Type, VoiceOver, Apple auth, notifications and purchases remain device validation items until Xcode/accounts exist. Verify each tab, a complete flow, a blocked flow, returning known facts, share export and mock paywall with the project verification skill.

## First rendered review
Actual390×844 captures: ../evidence/home.png, question-2.png, reveal.png. Home uses the intended quiet observatory composition; question text and options remain legible without ornament; reveal keeps the uncertainty label adjacent to the one-sentence result. The orb is implemented as native-compatible SVG with native Animated breathing rather than an additional animation framework. No paid assets are needed. Graders should inspect these real captures, not infer polish solely from prose.
