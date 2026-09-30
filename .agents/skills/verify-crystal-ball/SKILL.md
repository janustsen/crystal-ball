---
name: verify-crystal-ball
description: Launch and drive Crystal Ball's Expo preview and local prediction engine; verify the supplied 17-screen design, real readings, memory, share and mock plans before delivery.
---
# Verify Crystal Ball

## Launch
Run from this checkout. `npm install`, then `npm run server` (127.0.0.1:8787) and `npx expo start --web --no-dev --minify --host lan --port 8087`. Keep each process session/PID for cleanup. Ollama must serve the local Qwen model at 127.0.0.1:11435; SETUP.md documents task-local model storage. Supabase is optional. Native checks require Xcode and a development build; do not claim browser checks as native proof.

## Doctor
`curl -fsS http://localhost:8087/engine/health` must identify crystal-ball and ollama. Run `npm run check` and `npm test`. The browser defaults to the same-origin Metro bridge; leave EXPO_PUBLIC_ENGINE_URL unset. This lets the private Tailscale preview use the iMac engine rather than the MacBook's loopback. Keep the development server on the trusted private network.

Use `CHROME_DEVTOOLS_AXI_SESSION=crystal-ball chrome-devtools-axi open http://localhost:8087 --full`, then `emulate --viewport "390x844x1,mobile,touch"`. For remote-preview work also open http://janus-mac.tail8d2280.ts.net:8087. Use only the named profile. Snapshot IDs can be unreliable; firstmate explicitly authorized DOM eval and isolated Playwright drivers. Screenshot commands can report no path even when the file was written; inspect the named file before treating that as a failed capture.

## Drive
Run serially:

1. `node scripts/drive-design.mjs`: all 17 design states, real Spanish questions and reveal, Why, 1080×1920 PNG, export-error recovery, history persistence/outcome, fact edit/forget/Undo, plans/Restore, sensitive redirect, connection recovery, Explore, five tabs at 375×667 with 200% text and reduced motion. Includes axe scans.
2. `node scripts/drive-design-memory.mjs`: empty states, known-fact skip and re-asking after forget, real friend reading without owner-memory mutation, real model-authored general questions/reveal, self-harm support control, large-text Other input and reset preserving plan/credits. Only the OS share sheet is mocked; URL generation and engine requests are real.
3. `node scripts/drive-design-recovery.mjs`: microphone cleanup on typing (recognition constructor mocked), cancel during a held network request, actual 60-second timeout, and failed-prediction answer retention. Request failures are explicit fault injection.
4. `PREVIEW_URL=http://janus-mac.tail8d2280.ts.net:8087 node scripts/check-preview-bridge.mjs`: real remote bridge safety response, method/origin rejection and body-size limit. Use localhost instead when the Tailscale host is unavailable in another checkout.

Home orb / Ask tab opens the approach animation then voice. Choose Type instead for typing; Home suggestions open typing directly. Standard follow-up options advance immediately. In my own words exposes `other-input` and `answer-next`. Back returns to the preceding question; Close returns Home. Tabs are hidden during a reading and overlays. Share has a tappable story preview plus image/video/friend/reminder actions. Error and sensitive screens are reached by their real conditions, never seeded as successful forecasts.

The old `drive.mjs`, `drive-extended.mjs`, `drive-states.mjs` and `drive-general.mjs` document the superseded card/Next design; they are historical, not the current gate. The replacement drivers cover their user-facing invariants with the new navigation. The feature map under features/ owns current coverage.

## Evidence and boundaries
Keep screenshots/transcripts under docs/evidence/design-2026-09-30/. Preserve prior failures before rerunning a failing driver. Inspect the actual PNG, including 1080×1920 dimensions and absence of private question, facts and Why. Real Ollama is mandatory; do not substitute fixture predictions. These checks prove behavior and structure, not predictive accuracy.

Voice on remote HTTP falls back to typing; actual browser speech needs localhost or HTTPS and microphone permission. PNG works without ffmpeg; the current iMac lacks ffmpeg and MP4 therefore returns a recoverable export error. If ffmpeg is available, also export and inspect the real four-second video. Supabase mirroring, configured Apple sign-in and real purchases are unavailable locally. Billing stays explicitly simulated. Friend share-sheet and speech-constructor mocks are boundary tests, not hardware verification.

## Cleanup
Drivers create and close isolated temporary Chrome contexts. Do not stop another checkout's servers. If leaving the preview up for review, report owned sessions/PIDs and pending cleanup. Browser storage files containing anonymous auth stay under ignored .local. No public posting, real payments or data resets in another profile.
