# Run Crystal Ball

This checkout is an Expo React Native prototype. It runs anonymously, using local Ollama and optional local Supabase. No hosted credentials are included. Current verification uses Expo web390×844 because this Mac has Command Line Tools but no Xcode/iOS runtime. Native integrations are not claimed simulator-verified.

## Local development

1. `npm install` (Node22+).
2. Start Ollama with task-local models and a dedicated port: `OLLAMA_MODELS="$PWD/.local/models" OLLAMA_HOST=127.0.0.1:11435 OLLAMA_NO_CLOUD=1 ollama serve`. In another shell: `OLLAMA_HOST=127.0.0.1:11435 ollama pull qwen3:4b-instruct-2507-q4_K_M`.
3. Install Supabase CLI, then `supabase start` from this checkout. Project id crystal-ball-prototype uses55321API,55322Postgres,55323Studio. Docker is required. Anonymous auth is enabled; migrations install per-user row-level policies. `supabase status -o env` displays this local project's keys. Never use another project's key.
4. Copy `.env.example` to `.env.local`. Populate only EXPO_PUBLIC_SUPABASE_ANON_KEY from the local output. This public local anon key is not a service-role key. The app remains local-first if cloud mirroring is unavailable; it retries on the next state change.
5. `npm run server`, then `npm run web`. Open http://localhost:8087. Engine health: http://127.0.0.1:8787/health. Animated MP4 exports additionally require `ffmpeg` on PATH; still PNG export remains available if it is missing.
6. `npm run check && npm test`. Browser drive: `node scripts/drive.mjs` uses installed Chrome and an isolated temporary profile, localhost only. See `.agents/skills/verify-crystal-ball/SKILL.md`.

The server reads server-only variables from its shell, not Expo's public env loader. Keep MODEL_PROVIDER=ollama. No paid inference occurs by default. Local addresses work in an iOS simulator; a physical phone needs a trusted LAN-accessible development server and matching EXPO_PUBLIC_ENGINE_URL/Supabase URLs. Do not expose the unauthenticated local Node adapter publicly.

## Native development, deferred until Xcode exists

Install Xcode and an iOS Simulator runtime, accept the license, then `npx expo run:ios`. Use an Expo development build, not Expo Go, for speech recognition and purchase integrations. App scheme crystalball; bundle com.janustsen.crystalball. Verify VoiceOver, Dynamic Type200%, keyboard avoidance, safe-area, Android back, hold-to-speak release/cancel, notification permission and30-day scheduling. These checks are separate from the browser pass.

## Accounts Janus must create before hosted use

- **Supabase:** create a project using the YC Startup School promo. Enable anonymous sign-ins, apply supabase/migrations, configure Apple provider and manual identity linking. Put project URL and anon key in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Service-role secrets never enter Expo. Deploy the shared server handler via the edge-function entry point after adding JWT/auth enforcement and rate limits; the local Node adapter is deliberately loopback-only.
- **Apple:** register the bundle/App ID, enable Sign in with Apple, create the necessary Apple developer credentials and Supabase OAuth callback configuration. Preserve the anonymous UID when linking; do not silently replace it. The current account-save control is an honest setup stub until this configuration exists. No account is created by the prototype.
- **RevenueCat:** create project and iOS app, configure sandbox products and entitlement `plus`, offerings for monthly/annual and5/20 consumable packs. Set EXPO_PUBLIC_REVENUECAT_IOS_KEY to the public SDK key. Current UI stays mock and says so; src/purchases.ts contains SDK sandbox initialization/restore boundary. Real purchase success must be reconciled with server entitlements before enabling non-mock UI; local credits are test state, not secure money.
- **Hosted model:** create a Together (recommended first evaluation) or Groq account only when authorized. Server-only HOSTED_MODEL_KEY, HOSTED_MODEL_URL, HOSTED_MODEL_NAME and MODEL_PROVIDER=hosted select the provider. Do not set the key with EXPO_PUBLIC. Re-run the saved bake-off and safety corpus before adopting a model. No hosted calls were made here.
- **Research:** Google News RSS is prototype-only, not a licensed commercial research service. Replace it with an authorized provider before production. Retrieved headlines are only leads; Why says so.

## Known prototype boundaries

Forecasts are speculative, never proven future knowledge. Sensitive requests soft-block; classification fail-closed errors consume no reading. English plus a few Spanish/Danish phrase patterns is not multilingual safety coverage. Seeded Explore is visibly labeled. Apple save and web notification controls explain their native setup requirements. Friend links carry only the question and friend flag, not private answers. No App Store submission, public posting or real payments are part of this build.

Apple wiring now uses Apple.signInAsync followed by Supabase.auth.linkIdentity with the ID token, preserving the anonymous UID. It stays disabled until EXPO_PUBLIC_APPLE_LINK_ENABLED=true and the provider is configured. This is account wiring, not a verified native sign-in claim. The native purchase adapter can initialize RevenueCat and restore sandbox purchases; the current paywall deliberately remains mock.
