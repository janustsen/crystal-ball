# Crystal Ball

An Expo / React Native oracle prototype: ask a question, answer a few relevant cards, and reveal one confident, explicitly speculative forecast with a transparent Why.

- Cosmic glass orb, five tabs, local knowledge/history, editable facts, safe-topic redirects.
- Local Qwen through Ollama; deterministic numeric scenarios and constrained generation.
- Local Supabase anonymous mirror with RLS; mock RevenueCat pricing; Apple/native notification wiring.
- Private 9:16 still and animated MP4 exports; friend links; seeded Explore.

[Run and account setup](SETUP.md) · [Research decisions](docs/research/decisions.md) · [Visual review](docs/design/review.html) · [Verification evidence](docs/evidence/verification-summary.md)

`npm run check` and `npm test` cover types and engine/native-boundary regressions. The project [verification skill](.agents/skills/verify-crystal-ball/SKILL.md) drives the real local app. Tonight's observed surface is Expo web at 390×844; iOS Simulator, VoiceOver and real billing remain explicitly unverified until Xcode/accounts are configured. No public deployment or App Store submission is included.
