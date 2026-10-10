# Review decisions and binding constraints

## Captain age decision and review handoff — 2026-10-01

Birthday Skip requires one “I’m 13 or older” confirmation, including friend-link entry and legacy no-birthday profiles. Declining blocks access and survives reload. Confirmed skippers retain no birthday or Sun sign and use teen-safe defaults. A supplied under-13 birthday overrides confirmation. The former focus step is superseded by the [current onboarding usage](../../README.md).

`canRead` gates the app, reading saves and cloud mirroring. `restoreProfile` no longer treats old history or remembered facts as proof of age. Successful onboarding sets confirmation and completion before a friend reading can start, so its first save is eligible for mirroring without reload. The [profile contract](../../SETUP.md#reading-profile-and-birth-chart) owns API eligibility; the flag is an explicit self-attestation, not verified identity. The original birthday-removal decision was superseded; see the [profile contract](../../SETUP.md#reading-profile-and-birth-chart). Forget everything clears personal data while retaining 13+ eligibility; it does not restart onboarding.

Fractional day/week horizons are rejected alongside fractional months/years at the shared resolver. Person readings ask for clarification when the supplied first name is absent from the question; they neither infer names nor rewrite the question. This lexical consistency check is not semantic identity verification.

Blast-radius regression: `tests/age-confirmation.test.ts` executes profile restoration, the shared app/mirror eligibility predicate, both HTTP actions, date resolution, and planning/prediction subject checks. The browser driver `scripts/verify-age-confirmation.mjs` covers Skip/decline/persistence/friend entry using explicit model fixtures. Run the existing live drivers in the owning validation stage; configured Supabase replication and native storage/accessibility/sharing remain integration limits, not claimed passes. Preserve failed evidence. Delight, sound, styles, Golden assignment and global sensitive-topic redirects retain their existing paths.

Focused review verification passed: `./node_modules/.bin/tsx --test tests/age-confirmation.test.ts tests/reading-review.test.ts tests/reading-flow.test.ts` — 21 tests, 21 passed, 0 failed. Model responses in these tests are fixtures. The updated browser drivers, full typecheck/test gates, live Qwen and configured Supabase/native checks were not run in this review phase.

## Reading-flow acceptance and PR handoff — 2026-10-01

Firstmate resolved R3/R4/R5 and their review-N duplicates with these binding decisions. Include them in the reading-flow PR description:

- This branch's acceptance covers reading-flow work. Social features (Tonight's Sky, Circles, sealed forecasts and Friend readings), Daily omens, Golden forecasts and styles belong to separate PRs. School features remain deferred until after social lands.
- At this handoff, Due-date scheduling belonged to cb-retention. Retention is now integrated; [README](../../README.md) owns the current Check-in behavior and native verification limits.
- Global redirects for death, self-harm, illness, pregnancy and legal outcomes remain for everyone, including adult Person readings. “Anything goes for 18+” concerns tone, not removal of these safeguards.
- Preserve prior pipeline fixes. The remaining code correction covers repeated literal first-name occurrences in follow-up questions and options while retaining modal-verb rejection.

The outer executor owns PR publication, the Greptile request, readiness, and subsequent gates. This review phase records the decisions without executing those phases.

## Historical review decisions

Accepted: card/schema failures, unsupported general reasoning, missing topic inputs, wrong learning-goal reuse, inaccessible tab parent, clipping at enlarged text, missing empty-state assertions, missing real general-flow drive, stale screenshots, mismatched share preview, and unmeasured frame cadence. Fixes and fresh evidence live alongside this note.

At that historical review, the following suggestions conflicted with the then-current task contract. The card-count and numerical-flow decisions below are superseded by the [current question-engine contract](../research/question-engine.md):

- Fewer than three follow-up cards: the requested minimum is three. Known-input sessions use new topic-specific context rather than repeating known facts.
- A fabricated fallback after malformed model output: firstmate explicitly requires one repair, then fail closed. A recoverable error is intentional.
- Removing the ten-card numerical flow: the requested net-worth example and verification scope include ten distinct inputs. Defaults cannot silently replace requested context.
- Paid live odds, hosted inference, new accounts, public user recruiting or native App Store billing: not authorized tonight. Native simulator verification was explicitly waived because Xcode is unavailable.
- Claiming future predictive accuracy or calibrated clinical safety from these fixtures: impossible to establish tonight. The entertainment label and failed independent safety evidence remain visible.

A strict public-release safety gate was deliberately added to the research recommendations. It is not claimed passed. The deliverable is an isolated local prototype; grade files must retain any quality shortfall rather than relabel a regression or mocked SDK boundary as production proof.

Research capped at round ten below 9; see docs/grades/status.md. The annual mock offer is rejected for production activation under current cost estimates. Dedicated Qwen3Guard remains unexecuted: its generic harm taxonomy does not satisfy the benign medical/legal-outcome topic policy on its own, so it cannot replace the current policy without an additional evaluation. This is a remaining research gap, not an asserted impossibility.

The initial attempt to require explicit horizons only in validation reduced completion to 13/20: many model repairs still omitted the horizon. The next change constrains the horizon in the actual JSON schema as well, preserving the guard instead of weakening it. Both runs are retained. A synthetic template-only success is not substituted for general synthesis.
