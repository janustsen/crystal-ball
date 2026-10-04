# Plans

## Sub-features
Free daily allowance; Plus/credit mock purchase; Restore; optional Apple backup/restore availability; entertainment/privacy disclosure; named hosted-AI opt-in.

## How to get to it (user POV)
View plans in header or You.

## Driving it with chrome-devtools-axi
Observe balance, confirm Weekly is preselected, then select Weekly/Monthly/Yearly with accessible selected state, simulate five credits, verify increase; Restore must report test mode; You → Keep your glimpses must be absent on web and unavailable or unconfigured native builds; configured iOS retains Apple save/restore. It never appears on Home. Toggle Privacy and entertainment. `scripts/drive-launch.mjs` checks these controls at 200% text; `CHECK_AI_CONSENT=1` checks named-provider consent with a configured test build. Native Apple link/restore remains a device check.

Run `VERIFY_URL=http://localhost:8104 node scripts/verify-core-pricing.mjs` on an isolated live Ollama preview for exact prices and cancellation copy, weekly default, permanent packs, simulated Plus, bounded check-in, persisted answers and stacked plan cards at 200% text. It uses a named chrome-devtools-axi session. Screenshots and logs live under docs/evidence/core-pricing/.

## Gotchas
No real purchases. Native Apple/account/notification flows need configured accounts and a development build.
