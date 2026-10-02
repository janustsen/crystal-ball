# Plans

## Sub-features
Free daily allowance; Plus/credit mock purchase; Restore; optional Apple backup/restore availability; entertainment/privacy disclosure; named hosted-AI opt-in.

## How to get to it (user POV)
View plans in header or You.

## Driving it with chrome-devtools-axi
Observe balance, select Yearly/Monthly with accessible selected state, simulate five credits, verify increase; Restore must report test mode; You → Keep your glimpses must be absent on web and unavailable or unconfigured native builds; configured iOS retains Apple save/restore. It never appears on Home. Toggle Privacy and entertainment. `scripts/drive-launch.mjs` checks these controls at 200% text; `CHECK_AI_CONSENT=1` checks named-provider consent with a configured test build. Native Apple link/restore remains a device check.

## Gotchas
No real purchases. Native Apple/account/notification flows need configured accounts and a development build.
