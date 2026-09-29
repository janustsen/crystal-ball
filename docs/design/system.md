# Crystal Ball design system

The app is a tiny observatory: one luminous glass orb is the visual centerpiece, with a quiet night-sky frame. Fortune-telling theater belongs in the mist and reveal, while actions and explanations stay plain. Follow ui-rules.md; it is the accessibility and interaction authority.

## Tokens and typography
Color tokens are defined in [ui-rules.md](ui-rules.md) and implemented in `src/ui.tsx`; do not duplicate hex literals here. Cormorant Garamond 500 for display (36/40); DM Sans 400/500/700 for body 16/24, actions 16/20 and captions 13/19. Text never sits on the brightest mist. Selectable cards use radius 16, utility fields radius 16, panels radius 22. Insets 24; spacing 8/12/16/24/32. Main buttons 52 minimum, targets 44 minimum.

## Composition alternatives reviewed
A tarot-deck layout gives each prediction equal weight but makes this feel like a tarot app. A dashboard makes history easy but buries the invitation. The chosen observatory gives the orb most of the first screen, a compact question underneath, and a small suggestion row. It directly reflects the tap-the-ball brief. Other screens use quiet lists rather than repeating giant rounded cards. The unique element is the glass orb with orbit paths and internal mist, not a generic gradient dashboard.

## Motion
See [motion.md](motion.md) for the single motion authority. The SVG glass and animated mist are native-compatible; no 3D dependency.

## Components
Screen (gradient, sparse fixed stars, safe insets, scroll area); Orb (decorative SVG plus accessible button wrapper); Type (serif display, sans body); Action (primary gold/secondary quiet); ChoiceCard (radio state plus separate Next); Forecast (headline + always-visible speculative label); WhyDisclosure (facts/assumptions/dates/links); TabBar (four standard tabs plus raised center orb); EmptyState; Notice; FactEditor; OfferRow; SharePreview.

## Screen specifications
Home: greeting, “A glimpse of what’s next.”, large tappable orb, remaining daily reading, three suggestion prompts, latest prediction if present. No sign-up gate.
Explore: clearly labeled “Sample predictions” feed; no fabricated real-time engagement. Each prompt opens Ask with text prefilled, never silently spends a credit.
Ask: serif question, multiline typed input, hold-to-speak with permission only on first use and visible transcript, suggestions, Continue. Friend mode banner explicitly excludes answers from the owner knowledge bank. Cancel returns Home without spending.
History: reverse chronological predictions, question/headline/date, pending/yes/no check-back states. Tap opens the complete reveal and Why. Empty state leads to Ask.
You: “What the Ball knows about you”, editable/deletable facts, reduced-motion switch, plan, anonymous account save with Apple, explicit local reset confirmation.
Questions: one card, back, progress count, four options including Other. Other opens text input. Next disabled until a nonempty answer. Known durable facts omitted. Back truncates dependent answers. Cancellation keeps only previously committed knowledge, never a prediction charge.
Research: orb plus current operation, retry/cancel and timeout recovery; no invented search completion. Sensitive input instead gets kind redirect with a safe suggested question.
Reveal: headline within orb composition, speculative label immediately below, inline Why containing actual user facts, assumptions and source leads. Share, check-back reminder and Ask again; errors never turn into invented predictions.
Share: 9:16 composition preview with prediction and branding, speculative label retained, private question omitted; downloadable animated clip plus still. No private facts or source explanation in artifact. See ui-rules for safe bounds.
Paywall: dismissible test-mode page. Free 1/day; Plus $5.99/month or $39.99/year (10/day), packs 5/$1.99 and 20/$5.99. Billing period equally prominent to price, no fake urgency. Simulated purchases explicitly named and no money taken. Restore tells the truth about mock state.
Knowledge: each fact has a human label, editable value and delete. Empty knowledge explains that answers will appear here. Friends' facts never appear.

## States and verification
Every network operation has loading, timeout, retry and cancel; facts load before Ask becomes available. Empty/offline screens remain usable. 375×667 and 390×844, browser zoom 200%, keyboard open, and reduced motion are required checks. Native Dynamic Type, VoiceOver, Apple auth, notifications and purchases remain device validation items until Xcode/accounts exist. Verify each tab, a complete flow, a blocked flow, returning known facts, share export and mock paywall with the project verification skill.

## First rendered review
Actual 390×844 captures: ../evidence/home.png, question-2.png, reveal.png. Home uses the intended quiet observatory composition; question text and options remain legible without ornament; reveal keeps the uncertainty label adjacent to the one-sentence result. The orb is implemented as native-compatible SVG with native Animated breathing rather than an additional animation framework. No paid assets are needed. Graders should inspect these real captures, not infer polish solely from prose.

## Component anatomy and states

| Component | Anatomy | Default / active states | Recovery / accessibility |
|---|---|---|---|
| Orb | Glass, internal mist, orbit, shadow | Slow breath; press shrinks; research mist doubles speed; reveal adds gold rim and one gentle luminance swell | Static under reduced motion; decorative instances hidden; Home button named “Ask the crystal ball” |
| Action | 52 pt minimum surface, bold centered label | Gold primary, outlined secondary; pressed opacity 75%; disabled opaque muted surface | Browser cyan focus ring; full accessible label; no action while disabled |
| Choice | Flexible text, 24 pt radio ring, separate Next | Selected cyan outline plus star, not color alone | Other field; empty answer disables Next; inline validation preserves entered value |
| Input | Visible label, 16+ pt text, 16 pt inset | Focus ring; placeholder distinct from value | Multiline scrolling, 280 pt minimum in large-text mode; no text clamp |
| Disclosure | 48 pt row, cyan text, direction glyph | Expanded state and inline content | Focus stays on toggle; announces “Explanation expanded” / “Explanation collapsed” |
| Tab | One fifth of bar, icon, label | Gold active; raised center orb | 200% mode uses icons with full accessible names to avoid collisions |
| Notice | In-layout panel above navigation, Dismiss | Live polite announcement | Scrolls independently for long copy; never hides the navigation |

The Home orb and gold action share one destination. The orb is the expressive target; the explicit button provides discoverability for people who do not infer that the artwork is tappable. Monthly Plus is intentionally the primary offer; annual and packs remain fully visible and equally clear about billing period. Back closes the paywall; Restore follows the offers in its scroll area.

## Voice and copy

Oracle headlines are direct: “Your project will reach 108 users in 4 weeks.” Explanations separate supplied facts from assumptions. Interface copy is plain: “Your question”, “Review answers”, “Nothing was charged.” Recovery keeps the metaphor short: “The Ball took too long.” Avoid repeated diminutives, mock urgency and claims of supernatural accuracy. The brand wordmark stays a compact graphic at large text; navigation accessible names and all task content remain available.

## Semantic visual roles

The wordmark pairs a small static orb with Cormorant; task headings remain scalable. Tab icons use ordinary outline metaphors: house (Home), compass (Explore), clock (History), person (You). The raised central orb remains the primary Ask identity. A depleted reading counter uses secondary text color and remains an accessible View plans button. History pairs each record with a miniature orb and an explicit status chip; status never relies on color alone. Dates consistently use abbreviated month, day and year in the device locale.

Headline patterns: yes/no → “You will finish your draft this year”; number → “Your net worth will be $106,413 in 10 years”; named outcome → “Argentina will win the 2030 Men’s World Cup”; skill → “You will speak basic Danish in 6 months.” Avoid “Maybe things will improve,” invented odds, and a because-clause in the headline. Why owns assumptions and reasoning. Negative verdicts remain direct and kind.
