# Crystal Ball

An Expo / React Native oracle prototype: ask a question, answer a few relevant cards, and reveal one confident, explicitly speculative forecast with a transparent Why.

- Cosmic glass orb, five tabs, local knowledge/history, editable facts, safe-topic redirects.
- Local Qwen through Ollama; deterministic numeric scenarios and constrained generation.
- Local Supabase anonymous mirror with RLS; mock RevenueCat pricing; Apple/native notification wiring.
- Private 9:16 still and animated MP4 exports; friend links; seeded Explore.

[Run and account setup](SETUP.md) · [Research decisions](docs/research/decisions.md) · [Current design](docs/design/ui-rules.md) · [Verification evidence](docs/evidence/design-2026-09-30/README.md)

Tap the orb to move closer and start listening, or choose Type instead. Answer each follow-up by tapping an option; In my own words lets you type an answer. Reveal a forecast, expand Why, then share its story card or revisit it in History.

`npm run check` and `npm test` cover types and engine/native-boundary regressions. The project [verification skill](.agents/skills/verify-crystal-ball/SKILL.md) drives the real local app. Tonight's observed surface is Expo web at 390×844; iOS Simulator, VoiceOver and real billing remain explicitly unverified until Xcode/accounts are configured. No public deployment or App Store submission is included.
