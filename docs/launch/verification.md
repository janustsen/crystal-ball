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

## Captain steering follow-up

The decision documents now rank providers against under $0.01/free reading and approximately $0.0002/active-day omen; replace the 18+ suggestion with the approved 13+ audience / 12+ storefront target (with Apple's newer 13+ rating noted); and track teen/social/school privacy requirements and the shared optional-birthday profile contract. These are integration acceptance requirements, not a claim that the other lanes' features exist here.

The captain authorized up to $1 each for DeepInfra and Together. The benchmark CLI's offline `--check` passes budget rejection cases and typecheck passes. The external credential file existed but both keys were unpopulated; no hosted call occurred. That authorization was subsequently parked by the captain; the runner now refuses all live comparison calls until renewed authorization. No key is needed for the new subscription-backed local Codex test mode. An attempted local browser preview of the updated decision HTML timed out despite HTTP 200 from the local server; the document's decision text and inline script were checked directly. App runtime code was unchanged in this follow-up. The document server and owned browser session were stopped.

## Local Codex follow-up

`MODEL_PROVIDER=codex` is an explicit Node loopback development option, with configurable `CODEX_MODEL` defaulting to `gpt-6-luna`. The shared deployed provider factory rejects it; production mode is also rejected. It reuses ChatGPT subscription authentication, disables tools/hooks/project instructions, strips API-key environment overrides, and shares the existing one-repair/fail-closed validator. Ollama remains the committed default. This consumes subscription usage, not a hosted API benchmark budget.

The real CLI smoke returned schema-valid JSON in 4.257 seconds. The primary browser reading passed with 2.568-second planning and 11.811-second prediction; the complete interactive flow took 20.371 seconds. These are structural/interaction checks, not a claim of forecast accuracy. All four browser drivers pass, including recovery, general readings and sensitive redirects. Accessibility scans have zero violations but retain manual-check items in their evidence. Current unit suite: 38 pass, zero skipped; typecheck passes.

Omen and golden-reading paths are absent from this checkout and the fetched main branch at this checkpoint. They must be driven after the owning lanes integrate; they are not covered by substituting an ordinary reading. The redesign rebase and exact-head merge gate remain pending Firstmate's integration signal.

Three sequential synthetic HTTP readings with the real Codex CLI took **13.78s (money), 15.76s (Spanish), and 25.95s (novel)**. Median combined planning/prediction time: **15.76s**; median planning: 4.20s; median prediction: 9.67s. All returned validated forecasts. The novel plan was the slowest at 16.28s. This is a three-reading development sample, not a p95 benchmark, quality ranking or production latency guarantee. Output and timings: [latency evidence](../evidence/codex/latency.json). Browser evidence: [primary](../evidence/codex/drive.json), [extended](../evidence/codex/drive-extended.json), [recovery](../evidence/codex/drive-states.json), [general](../evidence/codex/general-flow.json), [accessibility](../evidence/codex/accessibility-flow.json), [tests](../evidence/codex/tests.txt). Owned local servers were stopped after verification.

## Redesign integration, 2026-10-01

Rebased onto merged redesign main `5c9e5d9`, preserving its motion/layout and adding consent to both typing and voice. Implementation head `c977193`. Typecheck and all 38 tests pass. Current design, memory/friend/general, recovery, launch disclosure, reduced-motion and isolated PostgreSQL RLS drives pass. The bridge's method/origin/size checks pass. Evidence is in [launch-rebase](../evidence/launch-rebase/).

The complete motion gate is **not passed**. First run: planning maximum frame 66.7ms with a 62ms task; share 43.9fps and maximum frame 300.1ms. [First trace and samples](../evidence/launch-rebase-motion/). The repeat's samples all meet the frame/draw/long-task budgets (share 59.7fps, max33.3ms), but `chrome-devtools-axi perf-stop` returned `MCP error -32001: Request timed out`, leaving no saved repeat trace. [Repeat samples and tool error](../evidence/launch-rebase-motion-repeat/). Both attempts are retained; the first miss is not erased by the repeat. No cause has been established. Per the worker's two-obstacle rule this is escalated before no-mistakes.

An initial browser navigation timed out during an 83-second cold Metro build. After the build finished, an unbounded action stalled; the driver was stopped and given bounded waits, then the full drive passed. [Retained setup failure](../evidence/launch-rebase-failures/). No product fix was inferred from that stall.

Remaining after the blocker clears: complete motion gate, synthetic hosted-consent build (including the new voice-screen assertion), refreshed iOS JS export, Codex drive on the redesigned UI, fetch/rebase if main moved, and no-mistakes/Greptile. Omen/golden are still absent on this main and require owning-lane integration. Native Apple authentication is still unverified. Owned servers were stopped at escalation; no PR was opened.

### Accepted motion exception

Firstmate resolved `launch-motion-gate` on 2026-10-01: “Accept the host-load motion exception (same as social and the redesign): the iMac runs ~12 workers, your repeat run passed all samples, and the trace tool timed out rather than the app failing. Record both runs in the PR and continue to no-mistakes, Greptile, ready. Don't retry the trace.” Both evidence sets above remain intact. This is an explicit exception, not a complete passing trace. No further trace retry is authorized.

After accepting the exception, the synthetic hosted-consent build passed typing and voice enable/revoke checks at 200% text, with no model call. The refreshed iOS JS export passed (not a device/native sign-in test). The complete redesigned primary browser drive also passed against actual `codex/gpt-6-luna`, including real reveal, Why, share, history, plans, safety redirect and request-failure recovery. See [consent](../evidence/launch-rebase/hosted-consent.json), [iOS export](../evidence/launch-rebase/ios-export.txt) and [Codex design drive](../evidence/launch-rebase/codex-design.json). Main was fetched again and remained `5c9e5d9`; no additional rebase was required at this handoff. Omen/golden are unintegrated and remain explicitly unverified. Owned servers were stopped before no-mistakes.
