# Social boundary proof

The change adds `/social` beside the existing engine API, reads optional profile fields, and moves deterministic sensitive-topic handling into a client-safe module. Ordinary reading requests are unchanged. The optional reading-identity and account-profile extensions are defined in `src/types.ts`; older records remain readable. Social state lives in new RLS tables; no migration rewrites existing account or reading rows.

The key safety fact is that authenticated clients cannot publish arbitrary text or enumerate question authors: only the trusted service creates moderation receipts, and the public RPC returns an explicit anonymous projection. `bash scripts/verify-social-db.sh` runs the actual migration and function bodies as distinct PostgreSQL roles. It rejects direct draft/star writes, foreign receipts, table enumeration, expired/replayed invites and unauthorized seals. It asserts the complete projection key set, report persistence, adult consent, Plus authorization and weekly quota. Two concurrent recipients race; exactly one succeeds.

Observed output:

```
PASS: SQL privacy invariants
PASS: real PostgreSQL RLS, anonymous projection, invite expiry/replay, leave, sealed privacy, and concurrent single-recipient claim
```

This reaches execution proof for SQL, and browser proof for publication approval, invitation, resonance, consented Friend reading, private notification, sealing, claim rejection and leaving (`social-drive.json`). Auth and PostgREST are simulated, so transport compatibility with the real Supabase stack remains unproven. No claim of production deployment readiness is made.

The shared safety extraction preserves the exact deterministic function: the engine re-exports the function that social display validation imports. `tests/social.test.ts` checks identity and sensitive/contact text rejection; existing engine tests still pass. `npm test`: 36 passed, one optional native export check skipped. `npm run check` passed. Actual Ollama anonymization removed the identifying sample and refused a sensitive question (`social-model.json`); this is not a comprehensive moderation-accuracy evaluation.

The provider boundary still permits exactly one repair before failing closed. A real Friend reading exposed missing repair detail, recorded in `social-friend-diagnosis.json`; its regression traverses the real handler/provider and asserts exactly two model attempts. The identical live request subsequently returned 200 with a complete Why.

Remaining integration risks:

- `src/social-policy.ts:26` reads the reading-flow lane's optional `sunSign` and `ageBand`; missing values are teen-safe. Adult consent was verified with an explicitly labeled profile fixture, not unmerged onboarding UI.
- `server/social.ts:38` allows mock Plus only with an explicit flag and loopback Supabase URL. Real subscriptions require trusted server entitlements; no paid account was configured.
- Three reports mean three anonymous accounts, not three distinct humans. Deployment needs anti-abuse/rate limits.
- For the current Friend-reading entry and sharing flow, see [usage](../../README.md). Generic Person readings remain owned by the reading-flow lane.
- Native link delivery, sharing, haptics and device behavior remain unverified. iOS bundle export passed; browser claim/share paths were driven.

Before merge, rebase onto the redesign and reading-flow changes, verify profile integration and run the project verification skill on that exact head. Re-run the SQL proof if the migration changes. The upcoming redesign remains a required integration step, not a verified property of this pre-redesign commit.

Core verification subsequently passed (`social-core-drive.json`): real Spanish reading with Other, six-month horizon, Why and one-credit debit; actual 1080×1920 PNG export; injected HTTP-500 recovery; history reload/reopen; knowledge edit/forget/undo; mock pack; sensitive redirect with unchanged credits; 375×667 at 200% text/reduced motion with all five tabs visible. Firstmate approved accepting the valid saved images despite the CLI path-report error; files were decoded and visually inspected. The exported image contains headline/date/brand/disclaimer, without question, answers or Why. Verification docs now describe Sky and the isolated social harness.

After the redesign rebase, social requests use `src/api.ts`'s same-origin engine URL. Metro explicitly allows `/engine/social` and forwards the bearer header; its engine port remains 8787 by default, with the task's isolated port selectable via `ENGINE_PORT`. `node scripts/prove-social-bridge.mjs` executes the real Metro and engine: authenticated profile sync returns 200; missing identity 401; wrong-port origin 403; wrong method 405. The outer Expo CORS layer rejected an initial non-local origin probe with 500 before our middleware; the retained bridge evidence names that distinction. No provider secret enters the web bundle.

The redesigned reveal supports reviewing current-session answers. Direct Friend readings clear that prior-answer reference so the action cannot reopen a previous personal reading's cards. See `src/types.ts` for the current prediction and account wire shapes.

## Greptile follow-up: blocks and invitation consumption

Blocking now guards `resonate` and `report_star` even when the caller retained the Star ID. The public projection excludes existing reactions and reports across either direction of a block; records remain available for audit. This can restore visibility when fewer than three unblocked reporters remain, as Firstmate authorized. The RPC signatures and anonymous projection fields are unchanged.

The safety fact is that block direction cannot restore public influence. `scripts/social-rls.sql` runs the real functions as separate authenticated identities: it rejects both writes in both block directions, excludes prior counts, and retains the existing unblocked/idempotent/three-report cases. The pre-fix run failed because `resonate` was allowed. The complete post-fix SQL driver passes, including concurrent seal claims. This is executable PostgreSQL proof, not real Supabase transport proof.

Invitation completion now clears only the `circle` route parameter through Expo Router. The safety fact is that handled invitation state cannot be reconstructed on remount/reload. An isolated Playwright regression reproduced the Join prompt reappearing before the fix, then exercised both join and decline through tab navigation and reload after the fix; both passed and the parameter was absent. The full social driver also asserts both navigation cases, while retaining invite replay and second-recipient checks. Native route behavior is not device-tested.

Evidence: [before/after regressions](social-greptile-regressions.json). Firstmate confirmed that requester-entered names are local nicknames, notifications describe authorized attempts, and client-declared age remains an accepted v1 limit; see [social semantics](../social/model.md).
