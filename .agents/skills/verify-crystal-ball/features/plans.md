# Plans

## Sub-features
Free daily allowance; Plus/pack purchase (labeled mock in the preview, real App Store purchases in EAS `store` builds); Restore; Manage or cancel subscription link; optional Apple backup/restore availability; entertainment/privacy disclosure; named hosted-AI opt-in.

## How to get to it (user POV)
View plans in header or You.

## Driving it with chrome-devtools-axi
Observe balance, confirm Weekly is preselected, then select Weekly/Monthly/Yearly with accessible selected state, simulate five credits, verify increase; Restore must report test mode; You → Keep your glimpses must be absent on web and unavailable or unconfigured native builds; configured iOS retains Apple save/restore. It never appears on Home. Toggle Privacy and entertainment. `scripts/drive-launch.mjs` checks these controls at 200% text; `CHECK_AI_CONSENT=1` checks named-provider consent with a configured test build. Native Apple link/restore remains a device check.

Run `VERIFY_URL=http://localhost:8104 node scripts/verify-core-pricing.mjs` on an isolated live Ollama preview for exact prices and cancellation copy, weekly default, permanent packs, simulated Plus, bounded check-in, persisted answers and stacked plan cards at 200% text. It uses a named chrome-devtools-axi session. Screenshots and logs live under docs/evidence/core-pricing/.

With local Supabase plus `SOCIAL_MOCK_ENTITLEMENTS=true`, mock purchases and every reading go through the real server ledger (`/engine/billing`); without Supabase the preview counts on-device. `scripts/billing-rls.sql` (run by `scripts/verify-social-db.sh`) proves the ledger, store reconciliation and Circle publication charges on real PostgreSQL; `tests/billing.test.ts` proves engine metering, webhook auth and local-only simulation. A web build with `EXPO_PUBLIC_REVENUECAT_MODE=store` must show the iOS-only notice with disabled purchase buttons. See [billing](../../../../docs/launch/billing.md).

## Gotchas
No real purchases in the preview; sandbox purchases need a signed iOS build and the accounts in docs/launch/billing.md. Native Apple/account/notification flows need configured accounts and a development build.

## Plus birth chart depth and narrated Ball
Plus feeds the You birth chart's Moon and rising into every Why (server-gated by the balance when billing is on), offers one chart weather reading a month in You, and narrates fresh reveals on-device with the speculative label (`narration-toggle` mutes). Run `VERIFY_URL=http://localhost:8097 node scripts/drive-plus-chart-voice.mjs` on an isolated live Ollama preview; it spies on browser speech synthesis only, and needs Open-Meteo city search. Evidence: docs/evidence/plus-chart-voice/. Native expo-speech output needs a device check.
