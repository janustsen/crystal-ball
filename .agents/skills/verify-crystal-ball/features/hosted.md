# Hosted readings

Public readings use the Supabase predict function and `server/hosted-limits.ts`. It verifies the caller through Supabase Auth before any inference, then uses service-only SQL admission and money RPCs. It requires the selected DeepInfra URL/model/disclosure, a key and `HOSTED_QUALITY_APPROVED=true`. Local Node development still uses Ollama by default. The aggregate `heard` attribution action uses no identity or model.

## Repeatable checks without paid inference

1. Run `npm run check` and `npm test`, including `tests/hosted-limits.test.ts`. These drive the public handler and shared provider: missing/expired auth, unapproved quality, wrong vendor, quota and budget denial, repair ordering, retained failure/missing-usage reservations. Fetch boundaries are synthetic; they are not a DeepInfra quality pass.
2. With PostgreSQL 17 available, set `TMPDIR` to an owned scratch directory and run `python3 scripts/verify-hosted-limits.py`. It creates and tears down its own loopback database on `HOSTED_PG_PORT` (default 55478), applies the real migrations and proves starter/free/Plus/pack allowances, shared reading attempts, ancillary quotas, concurrent daily and monthly admission, the exact $25 cap, idempotent settlement, UTC rollover and client denial of service-only RPCs. It proves SQL behavior, not hosted Supabase Auth/PostgREST compatibility.
3. Launch the standard isolated Node/Expo preview with `EXPO_PUBLIC_AI_PROVIDER_NAME=DeepInfra` in Expo only; leave Node's model local. Doctor its authenticated `/engine/health`. Run `APP_URL=<preview-url> CHECK_AI_CONSENT=1 EVIDENCE_DIR=<owned-scratch> node scripts/drive-launch.mjs` for consent enable/revoke and settings readability.
4. Run `APP_URL=<preview-url> EVIDENCE_DIR=<fresh-owned-scratch> node scripts/drive-hosted-limits.mjs`. It checks the DeepInfra details and denied-until-consented Ask, then injects two explicitly labeled 429 planning replies. Inspect the saved consent, monthly and daily screenshots: their text must be readable. Reduced motion makes capture deterministic. No vendor is called; do not label these UI faults as a live provider or database test. A cold Metro bundle can outlive navigation's timeout; retain the failure, doctor, warm the bundle and retry.

## Required before public activation

Follow `docs/launch/hosted-model.md`. The authorized benchmark is DeepInfra only, under $1, versus today's local Qwen. Empty `DEEPINFRA_API_KEY` in the designated external key file blocks the comparison. Preserve failures and inspect semantic forecasts/cards and sensitive redirects before setting quality approval. Never claim valid JSON establishes semantic quality or predictive accuracy.

After credentials and an approved Supabase target exist, deploy and smoke the actual hosted URL with an anonymous session: no/expired bearer and missing/wrong AI consent refuse before paid inference; a valid request returns a real reading; exhausted quotas and budget return the readable messages with no outbound model request. Inspect the server ledger and vendor usage. Local checks do not substitute for this hosted smoke or native TestFlight verification.
