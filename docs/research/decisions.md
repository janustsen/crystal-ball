# Current research decisions

This is the authoritative decision table. Earlier experiments remain historical evidence. Current phase grades live in `docs/grades/`; no research or generation gate is claimed passed yet. Firstmate authorized app construction alongside the research loop.

| Area | Decision | Evidence | Known failure and open gate |
|---|---|---|---|
| Local model | Select local Qwen3 4B Instruct 2507 Q4_K_M, structured JSON, one repair, then fail closed. | `evidence/comparison-summary.json`; `server/provider.ts` | Raw model outputs are unreliable. The complete engine must pass the generation gate. |
| Forecast contract | Numeric and named scenarios use server-owned choices. General topics use validated synthesis. Identical known facts should yield a consistent scenario, not random variation. | `../evidence/engine-bakeoff.json`; `server/engine.ts` | The 21-row fixture pilot is historical harness evidence only. Initial real-engine general answers copied news titles; these were rejected after review. Current semantic quality is owned by the generation gate, not claimed as a research success. |
| Follow-up cards | Follow the [adaptive question policy](question-engine.md), including the Love timing exception. | `src/questions.ts`; `tests/engine.test.ts` | Model-authored general cards remain semantically fallible. Do not ask the user to supply the future outcome. |
| Research path | Google News headline leads for fixed public world topics or competition/edition queries. Personal context stays in local inference. Wikipedia was evaluated, not selected. | `evidence/search-expanded.json`; `server/research.ts` | Headlines are not article research or proof of an outcome. Relevance is imperfect; commercial licensing is unresolved. |
| Safety | Deterministic topic rules, then local classifier; either can block. Retain 4B for the isolated prototype. No public safety clearance. | See the first-run table below and safety-policy.md. | Fifth blind set: 20/20 sensitive blocked, 0/20 safe blocked, 39/40 categories correct. One death question was misrouted to self-harm support; no public safety clearance. |
| Redirects | Third-party-aware self-harm support; neutral kind copy for other categories avoids wrong-category advice. | `server/safety.ts`; `server/engine.ts` | Category classification is not assumed reliable merely because block/allow passes. |
| Pricing | See [prototype pricing](pricing.md) for current offers, allowances and paywall rules. | `evidence/store-prices.json` retains competitor research. | Production cost and contribution gates are owned by the pricing document. |
| Hosted candidate | See the [hosted inference decision](../launch/hosted-model.md) for the current shortlist, cost ceiling and parked evaluation. | `model-bakeoff.md`; `evidence/source-excerpts.md` retain historical research. | Provider configuration, consent and launch gates are owned by the linked decision. |
| Sharing | See [sharing usage](../../README.md) for current exports and privacy boundaries. | `../evidence/exported-card.png` | Destination overlays and native sharing remain separate checks. |

Consistency is intentional: the Ball should not randomly change a number merely to feel surprising. Bounded answers trade novelty for auditable inputs; the unexpected part may be the scenario, not random rotation. The zero-variance fixture results support reproducibility but do not prove delight. A real target-user test must validate whether this is compelling.

Audience limitation: no 18–24 participants were contacted, and recruiting was not authorized. Pew's 18–29 survey is an adjacent proxy. Apple's RSS feeds returned no entries; review-sample.md separately codes all 11 unique reviews visible on the five public App Store web pages. Their ages are unknown and the sample is not representative. The top commercial risk is unvalidated trust, price comprehension and sharing motivation. `user-test.md` is the pre-pricing gate.

## Adoption gates and confidence

Commercial wedge confidence is **low**: no target-user desirability evidence supports the proposed differentiation yet. Prototype construction is a technical experiment, not market validation. In the planned five-person test, two or more people calling identical repeated answers broken or boring triggers a tested alternative: explicit scenario selection (optimistic/base/constrained), never random numbers presented as fresh evidence.

The local generation gate uses the 20 real-engine questions in `scripts/engine-bakeoff.ts`, including 10 open personal questions spanning school, careers, relationships, travel, writing and fitness. It requires zero malformed renders, preserved question horizons, 1–2 relevant cards, no invented citations, and each of three fresh Claude graders scoring at least 8.5/10 against definitiveness 20%, groundedness 25%, relevance 20%, one-line fit 15%, safety 20%. Failure stays a recoverable error after one repair. Never fabricate a fallback to make the benchmark pass.

The 4B historical 10-card model pipeline took 22.2 seconds; it is not the current UI architecture, which uses local card transitions. Initial planning and reveal should each remain below 8 seconds at p95; exceeding that is a performance failure to fix, even though the UI shows longer-wait copy at 8 seconds and recoverable timeouts. Planning deadlines follow the [adaptive question policy](question-engine.md); reveal retains its 60-second client timeout. The UI never holds a completed result. Raw browser and current-engine timings supersede historical pipeline timing.

The requested prototype carries the commercial wedge as an untested hypothesis. Recruiting and the five-session user test are deferred until separately authorized; neither a simulated target-user grader nor public app reviews count as that study. The 1/day and 10/day limits are test hypotheses, not observed audience demand. See user-test.md for reversal criteria.

## Safety first-run decision table

| Set / author exposure | Sensitive / safe | First-run recall / safe false blocks | Regression status | Current implication |
|---|---|---|---|---|
| Initial builder set; implementation known | 20 / 10 | 100% / 20% | Development-only | Not independent evidence |
| Outsider Claude; no source or builder context | 14 / 6 | 78.6% / 33.3% | 20/20 after tuning | First-run misses retained |
| Fresh Claude; no source | 20 / 20 | 95% / 15% | 40/40 after tuning | Not new generalization |
| Subsequent Claude, tools disabled; exact prompt retained | 20 / 20 | 85% / 5% | Latest regression recorded separately | Three original misses explicitly guarded; one later Danish residency regression received a guard too |
| Fifth Claude, tools disabled; previous questions excluded only | 20 / 20 | 100% / 0% | Untouched first run; category 39/40 | All four self-harm cases correctly routed; one death case received unnecessary self-harm support |

The fifth set is the latest untouched result of record. It clears the specified synthetic block/allow threshold, while misclassifying one Danish lifespan request as self-harm; this is not clinical or public-release validation. 8B achieved only 70% recall on it; translation repaired one of three misses, and thinking-8B had a timeout. None replaces the prototype's 4B path. `../evidence/safety-*-first-run.json` preserve outcomes; `safety-policy.md` records concrete categories, corrections and the unmet release gate.

## Production recommendations (not activated)

Keep the [current plans and packs](pricing.md) in test mode; that document owns the demand-validation and production-activation gates. Prefer Brave with the appropriate storage rights for a hosted production experiment, one public-topic query where research is needed; Google News remains local-prototype-only. The $5 monthly Brave credit can fund a small pilot but is excluded from steady-state economics because it does not scale per user.

The fifth set's death→self-harm category error was corrected by a targeted Danish phrase rule; the regression replay reached 40/40 categories. This tuned replay does not replace the untouched 39/40 first-run result or establish public-release readiness. All independent synthetic authors were Claude, so there is no model-family diversity. Excluding previous questions avoids duplicates but biases away from known failure modes. With only 20/20 sensitive cases blocked, the two-sided 95% Wilson lower bound is about 84%; 100% observed recall is not certainty.

## Later local candidate experiment

Qwen3.5 9B did not replace the 4B default: both completed 10/20 with an experimental card reviewer, and the larger model was slower. The reviewer itself was removed after it rejected valid input cards. See [the candidate comparison](../evidence/model-comparison.md) and the final engine replay for the actual outcomes.
