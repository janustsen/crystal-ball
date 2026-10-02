---
name: verify-crystal-ball
description: Launch and drive Crystal Ball's Expo preview and local prediction engine; verify the supplied 17-screen design, real readings, memory, share and mock plans before delivery.
---
# Verify Crystal Ball

## Launch
Run from this checkout. `npm install`, then `npm run server` (127.0.0.1:8787) and `npm run web -- --no-dev --minify --host lan`. Keep each process session/PID for cleanup. Ollama must serve the local Qwen model at 127.0.0.1:11435; SETUP.md documents task-local model storage. Supabase is optional. Native checks require Xcode and a development build; do not claim browser checks as native proof.

## Doctor
`node --input-type=module -e "import {previewFetch} from './scripts/preview-auth.mjs'; console.log(await previewFetch('http://localhost:8087/engine/health').then(r=>r.json()))"` must identify crystal-ball and ollama. Unauthenticated engine requests must return 401. Run `npm run check` and `npm test`. The browser defaults to the same-origin Metro bridge; leave EXPO_PUBLIC_ENGINE_URL unset. This lets the private Tailscale preview use the iMac engine rather than the MacBook's loopback. Keep the development server on the trusted private network.

Authenticate the browser using [the preview credentials documented in SETUP.md](../../../SETUP.md#local-development); never print credentials or put them in evidence. The drivers read the credential file automatically (or use EXPO_PUBLIC_PREVIEW_SECRET to match an already launched preview).

Use `CHROME_DEVTOOLS_AXI_SESSION=crystal-ball chrome-devtools-axi open http://localhost:8087 --full`, then `emulate --viewport "390x844x1,mobile,touch"`. For remote-preview work also open http://janus-mac.tail8d2280.ts.net:8087. Use only the named profile. Snapshot IDs can be unreliable; firstmate explicitly authorized DOM eval and isolated Playwright drivers. Screenshot commands can report no path even when the file was written; inspect the named file before treating that as a failed capture.

## Drive
Run serially:

1. `node scripts/drive-design.mjs`: all 17 design states, real Spanish questions and reveal, Why, 1080×1920 PNG, export-error recovery, history persistence/outcome, fact edit/forget/Undo, plans/Restore, sensitive redirect, connection recovery, Sky, five tabs at 375×667 with 200% text and reduced motion. Includes axe scans.
2. `node scripts/drive-design-memory.mjs`: empty states, known-fact skip and re-asking after forget, real friend reading without owner-memory mutation, real model-authored general questions/reveal, self-harm support control, large-text Other input and reset preserving plan/credits. Only the OS share sheet is mocked; URL generation and engine requests are real.
3. `node scripts/drive-design-recovery.mjs`: microphone cleanup on typing (recognition constructor mocked), cancel during a held network request, actual 60-second timeout, and failed-prediction answer retention. Request failures are explicit fault injection.
4. `PREVIEW_URL=http://janus-mac.tail8d2280.ts.net:8087 node scripts/check-preview-bridge.mjs`: real remote bridge safety response, method/origin rejection and body-size limit. Use localhost instead when the Tailscale host is unavailable in another checkout.

## Social and isolated-worker verification
`src/SocialScreen.tsx` replaces Explore with Sky. Run `node scripts/drive-social.mjs` for the multi-person journey and `node scripts/drive-social-core.mjs` for core regression through chrome-devtools-axi. These scripts use isolated named browser sessions and default to localhost:8095 (`SOCIAL_APP_URL` overrides the app URL). The core drive captures a real PNG download and injects one share HTTP-500 response; that injection is explicitly synthetic.

When the local Supabase stack is unavailable, `SOCIAL_DB_SERVE=1 bash scripts/verify-social-db.sh` creates a disposable PostgreSQL cluster and verification-only Auth/PostgREST adapter at 127.0.0.1:55329. Set the engine's `ENGINE_PORT=8795`, `APP_ORIGIN=http://localhost:8095`, `SUPABASE_URL=http://127.0.0.1:55329`, `SUPABASE_SERVICE_ROLE_KEY=verification-service-only` and `SOCIAL_MOCK_ENTITLEMENTS=true`. Launch Expo with `ENGINE_PORT=8795` (leave `EXPO_PUBLIC_ENGINE_URL` unset to exercise `/engine/social`), `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:55329` and `EXPO_PUBLIC_SUPABASE_ANON_KEY=local-verification-only`. These are synthetic local verification values, never real credentials. Doctor the corresponding `/health`. Set `PG_BIN` when PostgreSQL 17 is not installed at the script's Homebrew default. Stop only these owned processes afterward.

This fallback proves the actual SQL policies, app and model, not Supabase Auth/PostgREST compatibility. The social drive labels adult-profile setup as a fixture while onboarding is owned by a separate feature. Saved screenshot files may be valid even when chrome-devtools-axi misreports their path: Firstmate approved validating and inspecting the saved file as evidence; do not change the tool or claim a missing image passed.

Home orb / Ask tab opens the approach animation then voice. Choose Type instead for typing; Home examples appear as noninteractive fog whispers; tapping through them still opens the orb. Standard follow-up options advance immediately. In my own words exposes `other-input` and `answer-next`. Back returns to the preceding question; Close returns Home. Tabs are hidden during a reading and overlays. Share has a tappable story preview plus image/video/friend/reminder actions. Error and sensitive screens are reached by their real conditions, never seeded as successful forecasts.

The old `drive.mjs`, `drive-extended.mjs`, `drive-states.mjs` and `drive-general.mjs` document the superseded card/Next design; they are historical, not the current gate. The replacement drivers cover their user-facing invariants with the new navigation. The feature map under features/ owns current coverage.

Run `node scripts/check-preview-lockdown.mjs` as well: unauthenticated and origin-less POST rejection, protected client bundle, real authenticated planning, zero callbacks while reduced/hidden, resumed callbacks, and one request for a double final-answer click with recoverable retry. Visibility state is injected for a deterministic browser-boundary check; it is not a physical-device visibility test.

## Motion audit
After the functional drives finish, run `node scripts/drive-motion.mjs` on its own. It uses a fresh named chrome-devtools-axi profile, captures perf-start/perf-stop traces at 390×844, counts actual WebGL draws and display frames through each interaction, and closes only its own browser. Do not run other browser drives or bundle builds concurrently with the timing sample. The trace covers idle hero/Ask fog, approach, listening, typing, all three questions, thinking/reveal, sharing, tabs and 45 seconds of ambient sky. Targets: >=58fps, p95 <=20ms, no sampled frame >50ms and no long main-thread tasks. Keep failed measurements with their cause; do not replace them with an unexplained pass.

Inspect the image and watch both spheres: fog must deform without a rotating plate, reset or reverse; wisps escape and dissipate under a warm glow. Confirm sky visitors are above the room but behind the ball. Run `node scripts/check-motion-accessibility.mjs`. Toggle Reduce motion and confirm the canvas stops drawing and CSS animations stop; repeat with the OS preference and verify both orbs remain visible at large text. Native `Animated` uses its native driver, but an iOS bundle is not evidence of device frame rate. If no simulator/device is available, report that remaining boundary explicitly.

## Evidence and boundaries
Keep screenshots/transcripts under docs/evidence/design-2026-09-30/. Preserve prior failures before rerunning a failing driver. Inspect the actual PNG, including 1080×1920 dimensions and absence of private question, facts and Why. Real Ollama is mandatory; do not substitute fixture predictions. These checks prove behavior and structure, not predictive accuracy.

Voice on remote HTTP falls back to typing; actual browser speech needs localhost or HTTPS and microphone permission. PNG works without ffmpeg; the current iMac lacks ffmpeg and MP4 therefore returns a recoverable export error. If ffmpeg is available, also export and inspect the real four-second video. Supabase mirroring, configured Apple sign-in and real purchases are unavailable locally. Billing stays explicitly simulated. Friend share-sheet and speech-constructor mocks are boundary tests, not hardware verification.

## Cleanup
Drivers create and close isolated temporary Chrome contexts. Do not stop another checkout's servers. If leaving the preview up for review, report owned sessions/PIDs and pending cleanup. Browser storage files containing anonymous auth stay under ignored .local. No public posting, real payments or data resets in another profile.
