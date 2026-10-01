# Retention implementation and verification

Applies the captain's September 30 decisions: ball-set Due date controls Check-in; the Daily omen is personal and astrology-flavored, generated only while Home is open, once per local profile/day; no accuracy score. Home and the iOS widget share the cached omen. No reading allowance change.

## Data and blast radius

- `Prediction.dueDate?: string` is the reading-flow lane's YYYY-MM-DD contract. Existing forecasts fall back to creation date plus 30 days. There is no editable `checkInOn` field or headline-duration parser. History and notification scheduling consume the same date helper. Cloud mirroring already stores the complete forecast JSON; no SQL migration is needed.
- Omen input uses the existing `Facts` map, including `facts.sun_sign` when onboarding supplies it. A skipped Sun sign stays unknown; the generator cannot invent one. The producer of this key is an integration boundary with the launch lane, not another onboarding implementation here.
- `action: "omen"` reuses handler input limits and the configured provider. Its 160-token cap is opt-in; existing local-provider calls retain 600 tokens and existing hosted calls remain uncapped by this change. One short generation request per day retains the shared provider's one-repair-then-fail-closed rule. Default local Qwen costs no service money; hosted provider pricing/ranking belongs to launch, not a claimed cost measurement here.
- The private cache is separate from AccountState's reading balance. It durably claims the local day before inference, coalesces simultaneous calls in the app, and keeps failures cached. Forget everything erases its text while keeping the daily generation claim and invalidates in-flight results so old private omens cannot repopulate it. Like the existing reading allowance, this is device-local anonymous-profile state; it does not enforce a cross-device server quota.

The safety facts are executable in `tests/retention.test.ts`: legacy Due date fallback, supplied Due date precedence, invalid date rejection, native reading-id/date forwarding, web no-schedule boundary, one generation per day, cached failure/reload behavior, concurrent calls, reset during generation, shared handler validation, rejected invented Sun signs and clipped output, and unchanged provider defaults. Native OS calls and HTTP provider payloads are boundary mocks in those tests, not device proof.

## Observed model behavior

`omen-initial-failure.txt` and `retention-model-probe.txt` preserve actual failures. The initial model output invented Pisces without a supplied Sun sign and clipped a sentence at the schema limit. A later probe still clipped after repair. The validator rejects both cases; a shorter 8–14-word instruction addresses the observed length failure. `retention-model-short-probe.txt` records the complete Spanish-specific sentence from the real local model after that prompt change.

`retention-personal-model.json` records a real local call using Libra, Spanish and practice facts. `retention-skipped-sign-model.json` records a complete no-sign omen. These are output observations, not predictive-accuracy evidence. No made-up omen is substituted when inference fails; Home shows an unavailable state until the next day.

## Verification

- Typecheck and tests: 38 total, 37 pass, one existing ffmpeg-dependent skip.
- Web and iOS Expo exports pass; iOS prebuild generates DailyOmen's Swift widget, small/medium families, app group entitlement and extension target. Device compilation/rendering remains unverified.
- `scripts/drive-retention.sh` drives chrome-devtools-axi against the real app. `retention-drive.txt` covers the cached omen, unchanged credit count, Due date display, web notification preview, all verdicts, selected state and reload persistence. After that reload, `retention-cache-network.txt` records no fetch requests: the personal omen came from its daily cache.
- Primary verify-crystal-ball controls were driven on isolated 8094/8794 ports: all five tabs; real local-Qwen Spanish reading and Why; History/reload; knowledge edit/forget; sensitive redirect without charging; mock five-pack and Restore; 1080×1920 share PNG. Animated export reached its visible still-card fallback because ffmpeg is absent.
- The initial 375×667/200% text drive found verdict-row overflow; stacked choices fixed it. Current screenshots cover the personal omen and large-text Check-in. The merge gate must be repeated on the rebased final head after the redesign lands.

## Widget and native limits

Uses the official [Expo widget config plugin](https://docs.expo.dev/versions/latest/sdk/widgets/) and SwiftUI views, with a static gradient ball. It receives today's cached text and a next-midnight “open the app” entry. No future omens are pre-generated and no model request comes from the widget. Forget everything removes personal text without resetting plan, credits or the omen quota. Expo Go/web/Android keep Home's omen. OS scheduling may delay midnight refresh.

Xcode signing/build, physical widget rendering, notification permission/delivery, and cold/warm notification-tap navigation remain unverified until Xcode setup. No account, paid service or credential was added. This lane's browser/server processes are isolated from other workers; Metro uses a worktree-local TMPDIR to prevent shared-cache engine URL collisions.
