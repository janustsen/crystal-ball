# Social boundary proof

The change adds `/social` beside the existing engine API, reads optional profile fields, and moves deterministic sensitive-topic handling into a client-safe module. Existing reading request/response and persisted account formats are unchanged. Social state lives in new RLS tables; no migration rewrites existing account or reading rows.

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
- The current generic “Read about someone” entry delegates to the existing friend-mode reading flow. The reading-flow lane owns the first-name Person-reading refinement.
- Native link delivery, sharing, haptics and device behavior remain unverified. iOS bundle export passed; browser claim/share paths were driven.

Before merge, rebase onto the redesign and reading-flow changes, verify profile integration and run the project verification skill on that exact head. Re-run the SQL proof if the migration changes. The upcoming redesign remains a required integration step, not a verified property of this pre-redesign commit.

Core verification subsequently passed (`social-core-drive.json`): real Spanish reading with Other, six-month horizon, Why and one-credit debit; actual 1080×1920 PNG export; injected HTTP-500 recovery; history reload/reopen; knowledge edit/forget/undo; mock pack; sensitive redirect with unchanged credits; 375×667 at 200% text/reduced motion with all five tabs visible. Firstmate approved accepting the valid saved images despite the CLI path-report error; files were decoded and visually inspected. The exported image contains headline/date/brand/disclaimer, without question, answers or Why. Verification docs now describe Sky and the isolated social harness.

After the redesign rebase, social requests use `src/api.ts`'s same-origin engine URL. Metro explicitly allows `/engine/social` and forwards the bearer header; its engine port remains 8787 by default, with the task's isolated port selectable via `ENGINE_PORT`. `node scripts/prove-social-bridge.mjs` executes the real Metro and engine: authenticated profile sync returns 200; missing identity 401; wrong-port origin 403; wrong method 405. The outer Expo CORS layer rejected an initial non-local origin probe with 500 before our middleware; the retained bridge evidence names that distinction. No provider secret enters the web bundle.

The redesigned reveal supports reviewing current-session answers. Direct Friend readings clear that prior-answer reference so the action cannot reopen a previous personal reading's cards. The existing prediction/store wire shape stays unchanged.
