---
name: verify-crystal-ball
description: Launch and drive Crystal Ball's Expo web prototype and local prediction engine; verify the five tabs, real questions and reveal, knowledge, share, and mock paywall before delivery.
---
# Verify Crystal Ball

## Launch
Run from this checkout. `npm install`, then `npm run server` (127.0.0.1:8787) and `npm run web` (localhost:8087). Keep each command's PID/session for teardown. Ollama must already serve the local Qwen model at127.0.0.1:11435; SETUP.md documents isolated model storage. Do not stop another checkout's servers. Native simulator verification remains deferred by firstmate because Xcode is absent.

## Doctor
`curl -fsS http://127.0.0.1:8787/health` must identify crystal-ball and ollama. `npm run check` must pass. Confirm Expo log says localhost:8087. Use `CHROME_DEVTOOLS_AXI_SESSION=crystal-ball chrome-devtools-axi open http://localhost:8087 --full` and `resize 390 844`. Use the named session only. Never drive an unrelated profile.

## Drive
Use chrome-devtools-axi snapshots and their fresh IDs; never reuse stale generation IDs. `snapshot --full`, `click @<observed-id>`, `fill @<observed-id> 'text'`, `scroll down`, and `screenshot <absolute-evidence-path> --format jpeg` are the basic recipe. Stable accessible names: Home, Explore, Ask the crystal ball, History, You, Your question, Look into the future, Your own answer, Next, Reveal my prediction, Why this prediction?, Share this glimpse, Export story card, View plans, Reduce motion.

Start Home -> Ask -> choose Spanish suggestion -> Look into the future. Select one radio option per card, confirming Next. Use Other once with a typed answer. Wait for the real local model reveal. Expand Why; confirm the headline fits, the speculative label remains visible, and actual sources or no-source state appears. Open History, reload, reopen the same prediction. Open You, edit and forget a fact, start again and verify remembered values are skipped. Ask a sensitive question and confirm the kind redirect, unchanged credit count and no new history. Open share and export the actual PNG; inspect1080×1920 dimensions and absence of private facts. Open View plans; confirm test-mode disclosure, simulate a pack and observe credit count, test Restore. Explore friend link must include friend=1; its answers cannot enter You. Finish at375×667 and200% zoom, with reduced motion enabled.

## Evidence
Keep screenshots and transcripts in docs/evidence/. Record actual engine output/timing separately from mocked native checks. Observe credit, history and knowledge side effects through UI, not internal setters. The model must be local Ollama for the full flow; do not substitute a fixture to call it passed. Native-only boundary mocks must be explicitly identified. Follow features/README.md for coverage; use maintain-verification-skill when behavior changes.

## Cleanup
Stop only server/Expo processes started for this drive, using their captured sessions/PIDs. Keep docs/evidence. Use You -> Reset local data only in this isolated test profile, after recording needed side effects. No public posting or real payments. Do not kill by process name. If leaving the app up for review, record the two owned process sessions and pending cleanup rather than claiming cleanup happened.

## Helpers
`npm run check` and `npm test` are project checks. Browser interactions are intentionally through observed accessible controls, not test-only APIs.
