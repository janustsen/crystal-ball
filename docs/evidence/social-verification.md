# Social verification handoff

Initial implementation was verified on `d746718`. Rebased onto redesign `5c9e5d9`; the latest social/core evidence records the redesigned navigation, shared warm palette and authenticated same-origin engine bridge. Final no-mistakes and forge-review outcomes are reported separately.

- `npm run check`: pass.
- `npm test`: 36 pass, one optional native export skip.
- `bash scripts/verify-social-db.sh`: actual PostgreSQL RLS/privacy assertions and concurrent single-recipient claim pass.
- `node scripts/drive-social.mjs`: full three-person social journey passes with real Ollama and SQL; simulated Auth/PostgREST and explicit adult-profile fixture.
- `node scripts/prove-social-model.mjs`: identifying sample rewritten anonymously; sensitive sample denied a receipt. No comprehensive moderation accuracy claim.
- `node scripts/drive-social-core.mjs`: real reading, Other, Why, credit use, actual PNG, injected share-error recovery, history persistence, knowledge editing/forget/undo, mock pack, sensitive redirect, small-screen large text and reduced motion pass. Saved PNGs inspected under Firstmate's approval of the CLI path-report workaround.
- Additional chrome-devtools-axi check: Restore purchases displays its honest test-mode disclosure; Sky reachable.
- `npx expo export --platform ios --output-dir .local/social-ios-final`: pass. Native device/simulator behavior remains unverified.

Known integration work before final delivery: The redesign at https://github.com/janustsen/crystal-ball/pull/2 has merged and is integrated. Reconcile the reading-flow lane's age/sign profile and Person-reading entry, then rerun verify-crystal-ball on the exact final head. Firstmate requested Greptile review after the eventual PR opens. No PR has been pushed from this worktree. Real Supabase transport and trusted subscription entitlements remain explicitly documented deployment boundaries.

The screenshot CLI sometimes exits nonzero after saving a valid file. The harness validates the newly saved image; it does not suppress a missing/broken image. This is a reporting workaround authorized by Firstmate, not a tool change. Failed-drive evidence is retained.

Final rebase gate status: functional social/core drives and authenticated bridge checks passed on redesign main `5c9e5d9`. The strict serial motion audit did not meet its budget during heavy host load; see [motion boundary](social-motion-boundary.md). No-mistakes has not been started pending that validation boundary.

Firstmate subsequently approved the host-contention exception (2026-10-01): retain both timing results in the PR and re-measure on a real iPhone later. No-mistakes is authorized to proceed with that documented exception. The functional, privacy and authenticated-bridge checks remain passes; the strict desktop timing measurement remains a failure under contention.
