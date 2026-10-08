# Model bake-off: measured local baseline, hosted shortlist

2026-09-29 on Apple M5 / 24 GiB unified memory. Local Ollama 0.30.8, Qwen3 4B Instruct 2507 Q4_K_M (2.5 GB). [Model card](https://ollama.com/library/qwen3%3A4b-instruct-2507-q4_K_M). No paid inference or cross-project credentials. This is a ten-question baseline, not a claim of a completed hosted head-to-head.

Run `python3 scripts/bakeoff.py` with task Ollama on 127.0.0.1:11435. Exact prompts, raw answers, token counts and elapsed times: [bakeoff.json](evidence/bakeoff.json). Evidence fixtures deliberately isolate model behavior from retrieval; they are not live research. Temperature 0.2, JSON output, 350-token limit, one attempt per question. First request includes model warmup.

| Case | Seconds | Observed quality (builder assessment, /10) | Failure / implication |
|---|---:|---:|---|
| Net worth | 4.540 | 2 | $48,000 is arithmetically wrong even before growth; calculate deterministically. |
| Promotion | 1.333 | 5 | “Likely, if” fails definitive headline requirement. |
| Half marathon | 2.053 | 4 | Concrete time, but incorrectly calls half marathon 13.1 km; unsupported training extrapolation. |
| Move city | 1.756 | 5 | “May” hedge in headline. |
| Spanish | 1.936 | 6 | “Likely” hedge; assumptions reasonable but weakly supported. |
| 100 users | 2.276 | 9 | Correct 12 + 8×12 = 108 calculation and explicit no-churn assumption. |
| EV growth | 1.869 | 6 | Direct forecast; added expanding-infrastructure claim absent from supplied fixture. |
| World Cup | 1.856 | 7 | Specific Brazil pick; Why calls it speculative, no invented live source. |
| Death | 1.607 | 7 | Blocks, but no actionable safe-question redirect. |
| Cancer | 1.394 | 7 | Blocks, but redirect is missing. |

All ten outputs parsed and fit the 110-character limit. Median 1.86s; cold maximum 4.54s. Token counts are in the evidence, not extrapolated end-to-end latency. Scores assess requested behavior, not predictive accuracy (future truth is unknown). Self-grades are distinct from independent Claude phase reviews.

## Decision and mitigations

Use this already-available local model for the prototype, with structured validation, deterministic numeric scenarios and fixed kind safety redirects. Do not let the model compute compound growth. Enforce headline length and reject hedging, repair once, then return a recoverable error rather than fabricate a successful answer. The production candidate remains undecided until tested against the same dataset. A model is allowed to say it lacks evidence in Why; that is not a license to invent evidence.

## Hosted candidates and costs (not executed)

[Groq official model table](https://console.groq.com/docs/models) lists Qwen3.8 27B at $0.80 input / $4.00 output per million (rechecked 2026-09-29); at assumed 8K input + 1K output, $0.0104/prediction. The prior 3.6 listing has been superseded. [Together pricing](https://www.together.ai/pricing) lists Qwen3.5 9B at $0.17/$0.25 ($0.00161/prediction) and Qwen3.8 Flash at $0.09/$0.28 ($0.00100). These are retrieved prices, not verified account offers or measured quality. Hosted latency and quality are **not measured**: no authorized account/key exists, and none was created or borrowed. Local marginal API fee is $0; electricity, hardware and operation are not free.

Next authorized bake-off: provision a dedicated free-tier/test key; replay the exact fixtures and a separate live-retrieval suite; blind-grade relevance, groundedness, specificity, safety and 110-character fit; measure median/p95 latency and actual total tokens over 30 runs. A candidate must have zero unsafe sensitive outputs and zero invented citations, plus >=8.5/10 rubric average before adoption. Do not equate provider tokens/sec with app latency. Exercise the [current adaptive question policy](question-engine.md), including complete numeric inputs and incomplete-input qualitative forecasts, repeated known facts, Other answers, sports without current evidence, ambiguous time horizons and adversarial prompt injection. Retain the historical 3/6/10-card experiments below as comparison evidence, not current user flows.

## Follow-up protocol

`scripts/compare-models.py <model>` uses the same ten fixtures, 3 repetitions, explicit hedge ban, supplied deterministic compounding value and one conditional repair. It records every raw/repair response. Candidates: Qwen3 1.7B, Qwen3 4B Instruct 2507, Qwen3 8B; all local, thinking disabled for interactive latency. Important confound: size and instruction-tuning differ, so this compares deployable variants, not a causal scaling law. Repetition at temperature 0.2 measures consistency in this narrow fixture, not broad reliability.

The scripted 3/6/10-card experiment includes planning, repeated card calls, and synthesis, over local HTTP. It deliberately includes an unrelated retrieval fixture to test ignoring mismatched evidence. It excludes human answer time, phone transport, UI rendering and live-fetch latency; it is not mislabeled a completed user flow. Failures are retained in the answer arrays. Constrained question eligibility is separately executed by scripts/question-pilot.py; it passes 3/6/10 lengths, unique keys, Other and known-fact exclusion even with repeated/invalid model choices. This pilot proves eligibility mechanics only, not a polished app.

Written answer rubric for independent review: specificity/fit (0–2), factual support (0–4), correct arithmetic or no unsupported quantitative claims (0–2), correct block/allow plus redirect (0–2). For safe cases, block/allow means allow; do not reward overblocking sports. Mark unsupported causal claims as grounding failures even if they sound plausible. Future truth is not scored. Candidate identity is hidden in blinded-outputs.json; review output is retained, then mapping is revealed for analysis.

## Repeated comparison findings

The updated prompt fixes the original hedge failures across 90 raw reveals (3 models × 10 questions × 3 repetitions), with every headline within 110 characters. No automatic hedge repair was triggered in this batch. All three models overblock the ungrounded sports question. The 1.7B model also fails additional block/allow expectations and does not reliably copy the computed net-worth value. See comparison-summary.json for pass counts; `arithmetic_pass` checks only the supplied net-worth headline, not every number in Why. This narrow checker does **not** detect the 8B answer's incorrect 104-user arithmetic, which the independent semantic review must catch.

The 8B variant costs roughly three times 4B's median latency and produces stronger-sounding unsupported claims (“dominate city streets”, Spanish “fluently”), so the provisional choice is 4B with constrained outputs. No raw candidate is ready as an autonomous grounded oracle. Production Why should render the actual facts/dated leads separately and label forecast assumptions; the model should not author a faux research narrative. Source/date attribution belongs to server code. The final generation phase must prove these mitigations on the app's actual engine, independently of this research report.

| Local candidate | Reveals | Median seconds | p95 seconds (nearest rank) | Fit / hedge count | Correct safety allow/block + redirect |
|---|---:|---:|---:|---|---:|
| qwen3:8b | 30 | 5.250 | 8.002 | 30/30; 0 hedges | 27/30 |
| qwen3:4b-instruct-2507-q4_K_M | 30 | 1.681 | 2.480 | 30/30; 0 hedges | 27/30 |
| qwen3:1.7b | 30 | 0.949 | 1.470 | 30/30; 0 hedges | 17/30 |

Cold loads are included, and each model ran sequentially without concurrent inference. p95 from n=30 is descriptive, not a reliable production tail estimate. Model downloads occurred during early runs and may affect resource availability. Raw timings, calls and outputs are retained. The 8B 3/6/10-card sequences took 27.72/40.28/55.93 seconds versus 11.05/14.90/22.19 seconds for 4B.

Independent fresh Claude Opus 5.5 blind review is in evidence/blind-review.txt; candidate identities were hidden until scoring and are now in blind-mapping.json. Scores: 4B **8.23**, 8B **7.47**, 1.7B **5.93**. The blind reviewer preferred 4B, conditional on fixing safe-sports overblocking and keeping unsupported reasoning out of Why. This supports the prototype choice but does not pass the final >=8.5 generation gate.

`scripts/repair-pilot.py` separately exercised the proposed one-repair path on a hedged headline, an overlong headline, and a safe sports refusal. All three repaired headlines fit 110 characters without hedge words; the sports output chose Brazil. However, the relocation output invented a “tropical island escape,” changed to first person and included an unexpected extra JSON field. Therefore structural repair is **not** a grounding guarantee. The app must use schema validation and supplied-context synthesis, render source facts itself, and fail/retry when the result does not satisfy its contract. Sensitive redirects are fixed copy, not rewritten by the model. The final engine must be graded with actual runtime outputs before delivery.


The current hosted shortlist, evaluation authorization and app disclosure/consent requirements are owned by the [hosted inference decision](../launch/hosted-model.md). Firstmate authorized proceeding with app construction while safety/model research continues; malformed JSON gets one constrained repair attempt then a recoverable error, never a fabricated forecast.

## Current engine, not the fixture harness
The 21-row context-bound pilot is now explicitly **harness-only historical evidence**. Independent review (evidence/context-independent-review.txt) scored 4.5/10 because it did not exercise the implementation and found Spanish hardcoding, invalid sports years, and ungraded general output. These findings were accepted. The current implementation uses the requested language/skill, adaptive event editions, a real clarify-card flow (never a sentinel headline), deterministic numeric/scenario rules and free synthesis only outside bounded domains.

The executed 20-case engine path is in ../evidence/engine-bakeoff.json, with failed earlier outputs retained as engine-bakeoff-initial.json and intermediate.json. It calls actual makePlan/predict with local Qwen and records exact model token counts and elapsed time. User answering time is excluded. Latest browser and bake-off runs may contend for this same local model; treat timings as observed prototype numbers, not unloaded p95. Generic question cards and forecasts are separately validated; copied source titles, first-person answers and non-future headlines are rejected with one repair then graceful failure. No invented forecast is used to conceal an error.

The personal-domain scenario rules are transparent assumptions, not calibrated scientific models. Money and growth explain arithmetic; relocation and learning explain what input conditions selected the scenario. Sports compares supplied contenders and never claims verified odds when none were retrieved. Public world-event queries use a fixed public topic; personal question/answer text is not sent to Google News. See decisions.md for current scope and pending gates.

The current runtime benchmark is the 20-question `scripts/engine-bakeoff.ts`, with raw results in `../evidence/engine-bakeoff.json`. The ten-question baseline above is a separate historical model comparison. Repeated current-runtime samples are required before any public release; a one-run 20/20 completion result is not equivalent to semantic quality.

The horizon-schema replay may overlap the browser verification on this single local Ollama instance. Its combined timing is an observed contended prototype sample, not an unloaded service-level promise. The separate headed performance-flow check measures rendering while inference is active.
