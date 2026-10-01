# Crystal Ball

An Expo / React Native oracle prototype: ask a question, answer a few relevant cards, and reveal one confident, explicitly speculative forecast with a transparent Why.

- Cosmic glass orb, five tabs, local knowledge/history, editable facts, safe-topic redirects.
- Local Qwen through Ollama; deterministic numeric scenarios and constrained generation.
- Local Supabase anonymous mirror with RLS; mock RevenueCat pricing; Apple/native notification wiring.
- Private 9:16 still and animated MP4 exports; friend links; seeded Explore.

[Run and account setup](SETUP.md) · [Research decisions](docs/research/decisions.md) · [Current design](docs/design/ui-rules.md) · [Verification evidence](docs/evidence/design-2026-09-30/README.md)

Tap the orb to move closer and start listening, or choose Type instead. Answer each follow-up by tapping an option; In my own words lets you type an answer. Reveal a forecast, expand Why, then share its story card or revisit it in History.

Home example questions fade inside the fog as decorative whispers; tapping them opens the orb, not a prefilled question. Choose an Explore prompt to prefill a question instead. Reduce motion keeps one whisper still.

In You, enable Ambient sound for a low hum and a chime on each new reveal. It starts off and the preference is saved on this device. See [orb motion and feedback](docs/design/motion.md#orb-delight) for playback and native haptic behavior and verification limits. Plus adds readings and Classic, Gold or Obsidian ball and share-card styles, selected separately in You; without Plus, styles render as Classic.

New forecasts receive a cosmetic golden edition about 1 in 50 times on Free or 1 in 10 on Plus. Its reveal halo and special share card never mean the forecast is more likely true. The edition stays with the saved reading through reopening, sharing and plan changes; choosing a Gold style does not change its edition.

Home offers a free, personal astrology-flavored Daily omen, separate from your full reading allowance. Visit Home to generate it for the local day; return visits reuse it, and a failed generation stays unavailable until tomorrow. The iOS Home Screen widget shows the cached omen and asks you to open the app after midnight; it never generates an omen itself. See [widget setup and limits](SETUP.md#daily-omen-widget-and-check-ins).

Each reveal shows a fixed Due date. On native builds, saving a forecast automatically attempts to schedule “Did it come true?” if notification permission is already granted; use Remind me on the reveal or share screen to request permission. Tapping the notification opens the saved forecast. Reopen it from History or a check-in notification and choose Yes, Not quite, or Not yet; History keeps the outcome without an accuracy score. Web reminders are previews only. Forget everything in You clears readings, facts, private omen text and native check-ins while preserving plan, credits and daily usage.

`npm run check` and `npm test` cover types and engine/native-boundary regressions. The project [verification skill](.agents/skills/verify-crystal-ball/SKILL.md) drives the real local app. Tonight's observed surface is Expo web at 390×844; iOS Simulator, VoiceOver and real billing remain explicitly unverified until Xcode/accounts are configured. No public deployment or App Store submission is included.
