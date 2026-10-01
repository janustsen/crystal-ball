# Crystal Ball

An astrology-flavoured Expo / React Native oracle prototype: ask a question, answer one or two relevant cards, and reveal one confident, explicitly speculative forecast with a Why and Due date.

- Cosmic glass orb, five tabs, local knowledge/history, editable facts, safe-topic redirects.
- Local Qwen through Ollama; deterministic numeric scenarios and constrained generation.
- Local Supabase anonymous mirror with RLS; mock RevenueCat pricing; Apple/native notification wiring.
- Private 9:16 still story cards; friend links; seeded Explore.

[Run and account setup](SETUP.md) · [Research decisions](docs/research/decisions.md) · [Current design](docs/design/ui-rules.md) · [Verification evidence](docs/evidence/design-2026-09-30/README.md)

On first opening, enter your birthday and current focus or choose Skip for now. You can edit or forget these in You, and add birth time and city for Moon and rising signs. The app is for ages 13+; skipping your birthday keeps teen-safe defaults.

Tap the orb to move closer and start listening, or choose Type instead. For a Person reading, choose Ask about someone and enter a first name; nobody is notified. Answer each follow-up by tapping an option; In my own words lets you type an answer. Reveal a forecast with its Due date, expand Why for an astrological line and reasoning, then share its still story card or revisit it in History. Mock Plus opens the deeper Why, inputs and sources. See [accepted scope](docs/evidence/review-decisions.md#reading-flow-acceptance-and-pr-handoff--2026-10-01) for deferred Check-in scheduling and social features.

`npm run check` and `npm test` cover types and engine/native-boundary regressions. The project [verification skill](.agents/skills/verify-crystal-ball/SKILL.md) drives the real local app. Tonight's observed surface is Expo web at 390×844; iOS Simulator, VoiceOver and real billing remain explicitly unverified until Xcode/accounts are configured. No public deployment or App Store submission is included.
