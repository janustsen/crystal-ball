# Social v2 verification

- `npm run check`: passed.
- `npm test`: 121 passed, zero failed after `npm ci` restored the absent `circular-natal-horoscope-js` dependency.
- `SOCIAL_PG_PORT=55450 bash scripts/verify-social-db.sh`: passed actual migrations/RLS, discovery projection, requests/limits, ownership and accepted-invitation provenance, moments/glow, moderation receipts, due voting, targeted seals, leased notification authorization, concurrent seal claim and concurrent group publication (exactly one succeeds).
- `node scripts/drive-social-v2.mjs`: passed in five isolated chrome-devtools-axi sessions with real PostgreSQL and Ollama. `drive.json` records each assertion and labels the accelerated due date and activity RPC fixtures.
- `SOCIAL_APP_URL=http://localhost:8099 EVIDENCE_DIR=docs/evidence/social-v2/core node scripts/drive-social-core.mjs`: passed private-reading, export, memory, credit, safety and large-text regressions. See `core/social-core-drive.json`.
- First-use smoke: tapping Add my star without an identity opens Circles and requests an @handle before publication.

The browser engine doctor reported `{app:"crystal-ball",provider:"ollama"}`; unauthenticated bridge access returned 401. The saved friend and visitor PNGs were inspected. Browser export is 1080×1920. Screenshot commands sometimes report failure despite writing a valid image; drivers validate the saved PNG per the existing verification contract.

Preserved failed rounds document a superseded voice-entry selector, missing Close before returning to tabs, the emulation reload resetting navigation to Home, and the known screenshot-path reporting issue. They are not presented as successful runs. The expanded SQL suite also caught and then passed the targeted-seal variable/column ambiguity regression.

Limits: Auth/PostgREST is the isolated loopback adapter, not hosted Supabase. The due date is accelerated only inside the disposable cluster. Expo HTTP transport is mocked in unit tests; APNs/FCM, native link handling, released store installation, scheduler deployment and real subscription entitlements were not verified. Real Ollama samples establish functioning gate wiring, not comprehensive semantic safety or predictive accuracy.
