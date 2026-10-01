# Review decisions and binding constraints

## Reading-flow acceptance and PR handoff — 2026-10-01

Firstmate resolved R3/R4/R5 and their review-N duplicates with these binding decisions. Include them in the reading-flow PR description:

- This branch's acceptance covers reading-flow work. Social features (Tonight's Sky, Circles, sealed forecasts and Friend readings), Daily omens, Golden forecasts and styles belong to separate PRs. School features remain deferred until after social lands.
- Scheduling Check-ins on the Forecast's Due date is deferred to the cb-retention PR, which consumes `forecast.dueDate`. Due-date display remains part of this branch; the existing manual reminder is not evidence of Due-date scheduling.
- Global redirects for death, self-harm, illness, pregnancy and legal outcomes remain for everyone, including adult Person readings. “Anything goes for 18+” concerns tone, not removal of these safeguards.
- Preserve prior pipeline fixes. The remaining code correction covers repeated literal first-name occurrences in follow-up questions and options while retaining modal-verb rejection.

The outer executor owns PR publication, the Greptile request, readiness, and subsequent gates. This review phase records the decisions without executing those phases.

## Historical review decisions

Accepted: card/schema failures, unsupported general reasoning, missing topic inputs, wrong learning-goal reuse, inaccessible tab parent, clipping at enlarged text, missing empty-state assertions, missing real general-flow drive, stale screenshots, mismatched share preview, and unmeasured frame cadence. Fixes and fresh evidence live alongside this note.

Some reviewer suggestions conflict with the task contract and are not implemented:

- Fewer than three follow-up cards: the requested minimum is three. Known-input sessions use new topic-specific context rather than repeating known facts.
- A fabricated fallback after malformed model output: firstmate explicitly requires one repair, then fail closed. A recoverable error is intentional.
- Removing the ten-card numerical flow: the requested net-worth example and verification scope include ten distinct inputs. Defaults cannot silently replace requested context.
- Paid live odds, hosted inference, new accounts, public user recruiting or native App Store billing: not authorized tonight. Native simulator verification was explicitly waived because Xcode is unavailable.
- Claiming future predictive accuracy or calibrated clinical safety from these fixtures: impossible to establish tonight. The entertainment label and failed independent safety evidence remain visible.

A strict public-release safety gate was deliberately added to the research recommendations. It is not claimed passed. The deliverable is an isolated local prototype; grade files must retain any quality shortfall rather than relabel a regression or mocked SDK boundary as production proof.

Research capped at round ten below 9; see docs/grades/status.md. The annual mock offer is rejected for production activation under current cost estimates. Dedicated Qwen3Guard remains unexecuted: its generic harm taxonomy does not satisfy the benign medical/legal-outcome topic policy on its own, so it cannot replace the current policy without an additional evaluation. This is a remaining research gap, not an asserted impossibility.

The initial attempt to require explicit horizons only in validation reduced completion to 13/20: many model repairs still omitted the horizon. The next change constrains the horizon in the actual JSON schema as well, preserving the guard instead of weakening it. Both runs are retained. A synthetic template-only success is not substituted for general synthesis.
