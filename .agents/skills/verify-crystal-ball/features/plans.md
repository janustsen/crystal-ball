# Plans

## Sub-features
Free daily allowance; one-time soft Plus offer after a reveal (`plus-offer`, `plus-offer-open`, `plus-offer-dismiss`; never for Plus or web visitors); Plus/pack purchase (labeled mock in the preview, real App Store purchases in EAS `store` builds); Restore; Manage or cancel subscription link; optional Apple backup/restore availability; entertainment/privacy disclosure; named hosted-AI opt-in.

## How to get to it (user POV)
View plans in the header or You's plan card.

## Driving it with chrome-devtools-axi
Observe balance, confirm Weekly is preselected, then select Weekly/Monthly with accessible selected state (Yearly stays hidden while `annualOffered` is off), simulate five credits, verify increase; Restore must report test mode; You → Keep your glimpses must be absent on web and unavailable or unconfigured native builds; configured iOS retains Apple save/restore. It never appears on Home. Open Privacy and entertainment using the [user guidance](../../../../README.md). `scripts/drive-launch.mjs` checks these controls at 200% text; `CHECK_AI_CONSENT=1` checks named-provider consent with a configured test build. Native Apple link/restore remains a device check.

Run `VERIFY_URL=http://localhost:8104 node scripts/verify-core-pricing.mjs` on an isolated live Ollama preview for exact prices and cancellation copy, weekly default, permanent packs, simulated Plus, bounded check-in, persisted answers and stacked plan cards at 200% text. It uses a named chrome-devtools-axi session. Screenshots and logs live under docs/evidence/core-pricing/.

With local Supabase plus `SOCIAL_MOCK_ENTITLEMENTS=true`, mock purchases and every reading go through the real server ledger (`/engine/billing`); without Supabase the preview counts on-device. `scripts/billing-rls.sql` (run by `scripts/verify-social-db.sh`) proves the ledger, store reconciliation and Circle publication charges on real PostgreSQL; `tests/billing.test.ts` proves engine metering, webhook auth and local-only simulation. A web build with `EXPO_PUBLIC_REVENUECAT_MODE=store` must show the iOS-only notice with disabled purchase buttons. See [billing](../../../../docs/launch/billing.md).

## Gotchas
No real purchases in the preview; sandbox purchases need a signed iOS build and the accounts in docs/launch/billing.md. Native Apple/account/notification flows need configured accounts and a development build.

## Plus birth chart depth and narrated Ball
Follow the [Plus chart and narration usage](../../../../README.md) and [profile/API contract](../../../../SETUP.md#reading-profile-and-birth-chart); `narration-toggle` controls speech. Run `VERIFY_URL=http://localhost:8097 node scripts/drive-plus-chart-voice.mjs` on an isolated live Ollama preview; it spies on browser speech synthesis only, and needs Open-Meteo city search. Evidence: docs/evidence/plus-chart-voice/. Run `SOCIAL_PG_PORT=<free port> bash scripts/verify-social-db.sh` for the server-side monthly chart-weather claim (`scripts/chart-weather-rls.sql`). Native expo-speech output needs a device check.

## Year ahead
Inner Library → Your year ahead: twelve month balls, the simulated $9.99 purchase (unmetered preview or local Supabase with `SOCIAL_MOCK_ENTITLEMENTS=true`; real store builds show Coming soon), sealing by live Ollama, a sealed ball refusing to open, this month's ball opening into the reveal and History, and the Yearly plan's grant. Run `PREVIEW_URL=http://localhost:<port> node scripts/drive-year-ahead.mjs`; it moves the browser clock to next month's 1st to open the second ball and check in on the first. `OLLAMA_URL=http://127.0.0.1:<port> npx tsx scripts/verify-year-ahead.mts` prints three live generations (adult, teen, no birthday). Both are structural passes, not forecast quality. The 1st-of-month notification is unit-tested only; native delivery needs a device.

With local Supabase, buy Year ahead and separately simulate Yearly on a fresh account; both balances must grant Year ahead and permit sealing. Weekly, Monthly and packs must not grant it. Refresh the balance and verify the sealed months remain; turn off simulated Plus and verify ownership remains. An unentitled metered generation request must fail before inference. `tests/year-ahead.test.ts`, `tests/billing.test.ts`, and `tests/reading-backup.test.ts` cover these boundaries; `scripts/billing-rls.sql` checks server-only grants and persistence on PostgreSQL.
