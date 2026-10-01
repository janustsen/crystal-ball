# Run Crystal Ball

This checkout is an Expo React Native prototype. It runs anonymously, using local Ollama and optional local Supabase. No hosted credentials are included. Current verification uses Expo web390×844 because this Mac has Command Line Tools but no Xcode/iOS runtime. Native integrations are not claimed simulator-verified.

## Local development

1. `npm install` (Node22+).
2. Start Ollama with task-local models and a dedicated port: `OLLAMA_MODELS="$PWD/.local/models" OLLAMA_HOST=127.0.0.1:11435 OLLAMA_NO_CLOUD=1 ollama serve`. In another shell: `OLLAMA_HOST=127.0.0.1:11435 ollama pull qwen3:4b-instruct-2507-q4_K_M`.
3. Install Supabase CLI, then `supabase start` from this checkout. Project id crystal-ball-prototype uses55321API,55322Postgres,55323Studio. Docker is required. Anonymous auth is enabled; migrations install per-user row-level policies. `supabase status -o env` displays this local project's keys. Never use another project's key.
4. Copy `.env.example` to `.env.local`. Populate only EXPO_PUBLIC_SUPABASE_ANON_KEY from the local output. This public local anon key is not a service-role key. The app remains local-first if cloud mirroring is unavailable; it retries on the next state change.
5. `npm run server`, then `npm run web -- --host lan`. Open http://localhost:8087 or this iMac’s private Tailscale URL http://janus-mac.tail8d2280.ts.net:8087. Leave EXPO_PUBLIC_ENGINE_URL unset for web: Metro forwards same-origin `/engine` requests to the loopback engine, including `/engine/health`. A native simulator still defaults to http://127.0.0.1:8787. The bridge is development-only; keep this preview on the trusted private network. Story cards export locally as 1080×1920 PNG.
6. `npm run check && npm test`. Follow the [verification skill](.agents/skills/verify-crystal-ball/SKILL.md) for the current browser drives, remote bridge check and evidence requirements.

The server reads server-only variables from its shell, not Expo's public env loader. Keep MODEL_PROVIDER=ollama. No paid inference occurs by default. Local addresses work in an iOS simulator; a physical phone needs a trusted LAN-accessible development server and matching EXPO_PUBLIC_ENGINE_URL/Supabase URLs. Do not expose the unauthenticated local Node adapter publicly.

## Native development, deferred until Xcode exists

Install Xcode and an iOS Simulator runtime, accept the license, then `npx expo run:ios`. Use an Expo development build, not Expo Go, for speech recognition and purchase integrations. App scheme crystalball; bundle com.janustsen.crystalball. Verify VoiceOver, Dynamic Type200%, keyboard avoidance, safe-area, Android back, automatic listening, tap-to-stop and cleanup when leaving voice, notification permission and30-day scheduling. These checks are separate from the browser pass.

## Accounts Janus must create before hosted use

- **Supabase:** create a project using the YC Startup School promo. Enable anonymous sign-ins, apply supabase/migrations, configure Apple provider and manual identity linking. Put project URL and anon key in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Service-role secrets never enter Expo. Deploy the shared server handler via the edge-function entry point after adding JWT/auth enforcement and rate limits; the local Node adapter is deliberately loopback-only.
- **Apple:** register the bundle/App ID, enable Sign in with Apple, create the necessary Apple developer credentials and Supabase OAuth callback configuration. Preserve the anonymous UID when linking; do not silently replace it. The current account-save control is an honest setup stub until this configuration exists. No account is created by the prototype.
- **RevenueCat:** create project and iOS app, configure sandbox products and entitlement `plus`, offerings for monthly/annual and5/20 consumable packs. Set EXPO_PUBLIC_REVENUECAT_IOS_KEY to the public SDK key. Current UI stays mock and says so; src/purchases.ts contains SDK sandbox initialization/restore boundary. Real purchase success must be reconciled with server entitlements before enabling non-mock UI; local credits are test state, not secure money.
- **Hosted model:** create a Together (recommended first evaluation) or Groq account only when authorized. Server-only HOSTED_MODEL_KEY, HOSTED_MODEL_URL, HOSTED_MODEL_NAME and MODEL_PROVIDER=hosted select the provider. Do not set the key with EXPO_PUBLIC. Re-run the saved bake-off and safety corpus before adopting a model. No hosted calls were made here.
- **Research:** Google News RSS is prototype-only, not a licensed commercial research service. Replace it with an authorized provider before production. Retrieved headlines are only leads; Why says so.

## Known prototype boundaries

Remote HTTP origins cannot access browser speech recognition. The Ask flow offers typing when voice is unavailable; localhost or an HTTPS origin plus microphone permission is needed for real browser recording. Story export is a local 1080×1920 PNG. Supabase is optional and not running here: local history and memory work, cloud mirroring does not.

Forecasts are speculative, never proven future knowledge. Sensitive requests soft-block; classification fail-closed errors consume no reading. English plus a few Spanish/Danish phrase patterns is not multilingual safety coverage. Seeded Explore is visibly labeled. Apple save and web notification controls explain their native setup requirements. Friend links carry only the question and friend flag, not private answers. No App Store submission, public posting or real payments are part of this build.

Apple wiring now uses Apple.signInAsync followed by Supabase.auth.linkIdentity with the ID token, preserving the anonymous UID. It stays disabled until EXPO_PUBLIC_APPLE_LINK_ENABLED=true and the provider is configured. This is account wiring, not a verified native sign-in claim. The native purchase adapter can initialize RevenueCat and restore sandbox purchases; the current paywall deliberately remains mock.

## Reading profile and birth chart

The profile is local-first: optional `birthday` (ISO date), lowercase `sunSign`, `ageBand` (`teen`, `adult`, or null), and optional `birthTime`, `birthPlace`, `moonSign`, `risingSign`. Null age uses teen safeguards. Onboarding blocks under-13 birthdays before cloud identity creation. Person readings accept one first name, send no notifications, and pass the output safety classifier with stricter teen/unknown rules.

Moon/rising use the pinned `circular-natal-horoscope-js` ephemeris on device. Its published `module` entry points at absent source, so Metro imports the shipped `dist/index` bundle. City lookup is a separate, no-key prototype boundary using [Open-Meteo / GeoNames](https://open-meteo.com/en/docs/geocoding-api); only the city query is sent. The hosted free endpoint is non-commercial: production needs a licensed or self-hosted lookup before activation. No paid account or credentials are configured.

New forecasts include `dueDate` as `YYYY-MM-DD`; it is optional only for older saved forecasts. Retention owns scheduling the Check-in. `astrology` and the short `why` remain visible to free users; `deeperWhy` plus inputs/assumptions/sources are shown to mock Plus. This is client gating in the existing local mock subscription model, not production entitlement enforcement.
