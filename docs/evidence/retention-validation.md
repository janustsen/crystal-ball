# Retention implementation and verification

Records implementation and verification of the captain's September 30 retention decisions. Current user behavior is owned by [README](../../README.md); date integration and native setup limits are owned by [SETUP](../../SETUP.md#daily-omen-widget-and-check-ins).

## Data and blast radius

- The date contract and reading-flow dependency are in [SETUP](../../SETUP.md#daily-omen-widget-and-check-ins). There is no editable `checkInOn` field or headline-duration parser. History and notification scheduling consume the same date helper. Cloud mirroring already stores the complete forecast JSON; no SQL migration is needed.
- Omen input uses the existing `Facts` map, including `facts.sun_sign` when onboarding supplies it. A skipped Sun sign stays unknown; the generator cannot invent one. The producer of this key is an integration boundary with the launch lane, not another onboarding implementation here.
- `action: "omen"` reuses handler input limits and the configured provider. Its 160-token cap is opt-in; existing local-provider calls retain 600 tokens and existing hosted calls remain uncapped by this change. One short generation request per day retains the shared provider's one-repair-then-fail-closed rule. Default local Qwen costs no service money; hosted provider pricing/ranking belongs to launch, not a claimed cost measurement here.
- The private cache is separate from AccountState's reading balance. It durably claims the local day before inference, coalesces simultaneous calls in the app, and keeps failures cached. Forget everything erases its text while keeping the daily generation claim and invalidates in-flight results so old private omens cannot repopulate it. Like the existing reading allowance, this is device-local anonymous-profile state; it does not enforce a cross-device server quota.

The safety facts are executable in `tests/retention.test.ts`: legacy Due date fallback, supplied Due date precedence, invalid date rejection, native reading-id/date forwarding, web no-schedule boundary, one generation per day, cached failure/reload behavior, concurrent calls, reset during generation, shared handler validation, rejected invented Sun signs and clipped output, and unchanged provider defaults. Native OS calls and HTTP provider payloads are boundary mocks in those tests, not device proof.

## Automatic check-ins

The scheduling behavior is described in [README](../../README.md). Tests in `tests/check-in.test.ts` exercise granted/denied permission, manual opt-in, date/id forwarding, web behavior, and scheduling failures through the shared reminder action; native delivery remains unverified.

## Observed model behavior

`omen-initial-failure.txt` and `retention-model-probe.txt` preserve actual failures. The initial model output invented Pisces without a supplied Sun sign and clipped a sentence at the schema limit. A later probe still clipped after repair. The validator rejects both cases; a shorter 8–14-word instruction addresses the observed length failure. `retention-model-short-probe.txt` records the complete Spanish-specific sentence from the real local model after that prompt change.

`retention-personal-model.json` records a real local call using Libra, Spanish and practice facts. `retention-skipped-sign-model.json` records a complete no-sign omen. These are output observations, not predictive-accuracy evidence. No made-up omen is substituted when inference fails; Home shows an unavailable state until the next day.

## Verification

- Typecheck and tests: 39 total, 38 pass, one existing ffmpeg-dependent skip.
- Web and iOS Expo exports pass; iOS prebuild generates DailyOmen's Swift widget, small/medium families, app group entitlement and extension target. Device compilation/rendering remains unverified.
- `scripts/drive-retention.sh` drives chrome-devtools-axi against the real app. `retention-drive.txt` covers the cached omen, unchanged credit count, Due date display, web notification preview, all verdicts, selected state and reload persistence. After that reload, `retention-cache-network.txt` records no fetch requests: the personal omen came from its daily cache.
- Primary verify-crystal-ball controls were driven on isolated 8094/8794 ports: all five tabs; real local-Qwen Spanish reading and Why; History/reload; knowledge edit/forget; sensitive redirect without charging; mock five-pack and Restore; 1080×1920 share PNG. Animated export reached its visible still-card fallback because ffmpeg is absent.
- The initial 375×667/200% text drive found verdict-row overflow; stacked choices fixed it. Current screenshots cover the personal omen and large-text Check-in. Rebased onto the merged redesign at 5c9e5d9; the current warm-theme evidence is in retention-rebase/.

## Widget and native limits

Uses the official [Expo widget config plugin](https://docs.expo.dev/versions/latest/sdk/widgets/) and SwiftUI views, with a static gradient ball. It receives today's cached text and a next-midnight “open the app” entry. No future omens are pre-generated and no model request comes from the widget. Forget everything removes personal text without resetting plan, credits or the omen quota. Expo Go/web/Android keep Home's omen. OS scheduling may delay midnight refresh.

Xcode signing/build, physical widget rendering, notification permission/delivery, and cold/warm notification-tap navigation remain unverified until Xcode setup. No account, paid service or credential was added. This lane's browser/server processes are isolated from other workers; Metro uses a worktree-local TMPDIR to prevent shared-cache engine URL collisions.


## Rebased design verification

The current design, memory and recovery drivers passed against real local Qwen on 8094/8794. Transcripts and screenshots are in [retention-rebase](retention-rebase/). The same-origin bridge check passed after server readiness; its earlier startup race was retained locally. Typecheck, 38 passing tests (one ffmpeg skip), both platform exports and iOS prebuild passed after integration.

All 17 motion samples passed the original frame budget (59.2–60.3fps, maximum 33.4ms). The driver's perf-stop summary timed out after saving the complete 243MB raw trace. Recovery parsed that JSON, verified every start/end mark and enforced the unchanged frame assertions; the timing-only excerpt and SHA-256 provenance are in [retention-rebase-motion](retention-rebase-motion/). This is recovered trace evidence, not a clean driver exit. OS/in-app reduced motion, resume and large-text checks passed.

The chrome-devtools-axi retention drive twice lost its selected page. Firstmate authorized an isolated Playwright profile for the remaining live controls and screenshots. No shared browser state was changed.

The isolated Playwright retention drive passed: real personal omen, all three verdicts, Due date, reminder web fallback, unchanged credits, reload persistence and viewport bounds. See retention-rebase/retention-drive.txt, personal-omen.png and check-in.png. Driver setup failures (missing initial action and an omitted aria-busy=false attribute) are preserved alongside the successful evidence.
