# Verification handoff

Implementation was checked in the isolated `fm/cb-launch` worktree on 2026-09-30. No paid calls, external accounts, provider keys or shared-database changes.

- `npm run check`: pass.
- `npm test`: 36 pass, zero skipped with worktree-local FFmpeg on PATH.
- `npx expo export --platform ios --output-dir .local/ios-export`: pass; this is a JS bundle, not a signed/native device run.
- All four project drivers pass against this checkout at app 8096 / engine 8796: primary, extended, states, general. Real local Ollama supplies the forecasts. Primary flow measured 10.073 seconds. The general-flow accessibility scans report zero violations.
- `scripts/drive-launch.mjs`: Home entertainment text and no initial login; You optional backup fallback, privacy disclosure and 200% text. A separate 8097 build with a synthetic named AI provider proves opt-in/revocation gating without making any model call.
- `scripts/verify-backup-db.mjs`: production migrations pass ownership/RLS proof in isolated PostgreSQL via PGlite. Not a shared Supabase deployment.
- Production Supabase query-builder tests prove current-session ownership, fresh-device restoration, preserved local entitlements and rejection of malformed cloud history. Apple UI/token exchange remains unverified on device.

[Evidence summary](../evidence/launch/summary.json), [primary drive](../evidence/launch/drive.json), [extended](../evidence/launch/drive-extended.json), [states](../evidence/launch/drive-states.json), [general](../evidence/launch/general-flow.json), [tests](../evidence/launch/tests.txt), [native export](../evidence/launch/ios-export.txt), [backup RLS](../evidence/launch-backup-rls.json), [launch UI](../evidence/launch-ui.json). Failed setup/cache evidence remains in `docs/evidence/launch-failures/`; prior model-grade evidence remains unchanged.

Concurrent Metro instances initially mixed public environment variables in the shared temporary cache. A checkout-local `TMPDIR` fixed the observed bundle; its engine URLs then contained only 8796. The verification skill now documents isolated cache/ports. Verification dependencies FFmpeg, Playwright recording FFmpeg and PGlite were installed under ignored `.local`, not globally.

Before no-mistakes shipping: rebase onto the redesign once https://github.com/janustsen/crystal-ball/pull/2 merges, resolve any UI changes and rerun the merge gate on the exact resulting head. This document records the local implementation handoff, not a green PR or public-launch approval. The worker does not push or merge during this handoff.
