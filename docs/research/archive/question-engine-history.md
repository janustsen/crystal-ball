# Superseded question-policy experiments

No policy in this file governs the current app. See ../question-engine.md.

## Historical experiments (superseded policies)

# Question engine experiment and proposed contract

The unconstrained multi-call experiment is retained in compare-*.json. On 4B, every flow repeats `project_user_growth`, and some cards ask the user for the very future outcome being predicted. This is a product-breaking failure, not a successful adaptive interview. The measured durations/token totals remain useful as call-cost observations but are not app-completion evidence.

Use model selection over an eligible registry rather than freeform question creation on every turn. Each fact has a stable key, label, options, domain, and lifetime (durable versus this forecast only). Remove durable known facts before selection. Remove all already-answered keys. After every answer, re-evaluate eligible questions (e.g. employment gates salary context; a low time budget prioritizes constraints). Model ranking is advisory; invalid IDs cannot enter the sequence. Every option list has an Other field. User-entered text is data, never an instruction.

Minimum 3, maximum 10 newly answered cards. For a repeat visitor with a complete profile, use session-specific context (scope, deadline and changes for this particular forecast) rather than repeating the same personal facts. The net-worth flow starts at 10 missing inputs, shorter questions use 3–6. Stop after the domain's sufficient set is answered, but never before three. Back edits truncate dependent later answers, so stale downstream cards do not survive changed context. Only personal predictions may learn durable facts; friend's answers never enter the owner's bank. Knowledge edits and deletion affect subsequent questions immediately.

Why this constrained approach: it bounds repetition structurally, keeps vocabulary consistent for editable memory, reduces generation latency, and gives unknown facts real semantics. For unusual questions, the model produces a plan once with 3–10 unique keys; reject duplicates, sensitive fields and outcome-asking cards before presentation, with a small domain-neutral context fallback. The fallback is marked as a deliberate prototype ceiling; it must not silently masquerade as deep personalization.

## Expanded pilot correction

The initial question-pilot.json was structurally bounded but lifecycle-inappropriate: a first-time user could see a “last forecast” card. It is retained as failed historical evidence. The corrected script writes question-pilot-expanded.json and excludes `change` unless `returning=true`. It drives growth, relocation, sports and Spanish-learning registries, both first and repeat visits, at 3 and 10 cards, with real local 4B ranking. Known facts are excluded and low time budget changes the next card to constraints (an executed adaptive branch). Sports uses event-context cards rather than irrelevant personal effort/budget questions. The initial pilot also covered the six-card bound; the final app must cover 3, 6 and 10 on its actual state machine.

UX decision: rank once per session, then select instantly from eligible cards. Do not pay a ~2.48s model p95 on every tap. Target card transition <=200ms; initial plan/reveal typically 2–5s, show real loading immediately and recovery copy at 8s. 60s is the hard network deadline, not a desired wait. Ten cards are allowed only for context-heavy numerical questions and remain a burden hypothesis to test; prefer 3–6 otherwise. See user-test.md for phone completion budgets.

## Independent semantic review and final policy correction

followup-independent-review.txt flags five material flow-quality issues despite the expanded pilot's structural pass. A `pass` in that JSON means bounded/unique/Other/known-skip only; it never meant question relevance passed. Specific findings: model ranks omit the learner's starting level, sports receives only one ranked ID and ten-card sports flows become irrelevant preference questionnaires. Those are accepted findings.

Correction: essential facts precede advisory model ranks (learning level cannot be omitted). Ten is a ceiling, not a target: sports stops at three useful event context cards; learning/relocation cap at six. Growth/financial context can use up to ten. The reproducible scripts/question-policy-correction.py replays the retained real rank evidence under this rule and produces question-policy-correction.json (16 scenarios, all structural checks pass). A returning visit need not force a “change” card when enough unknown relevant facts exist; this is not a defect. The original ten-card stress scenarios and critique are retained as failed research, not app acceptance evidence.

Final follow-up corrections before the next research grade: relocation now begins with current location, desired destination, work and lease (skipping known values); growth prioritizes current users, growth, retention and distribution and also caps at six; the sports field-status question now matches its answer options. Rerun evidence is question-policy-correction.json. Ten-card flows are reserved for numerical scenarios with genuinely distinct parameters (e.g. savings, growth, contribution changes and planned withdrawals), to be implemented and verified in the app, not forced on each research topic.

## Implemented registry and numeric path
The executable registry now lives in src/questions.ts. Net worth has ten explicit inputs (currency,assets,debt,monthly savings,years,return,savings growth,withdrawals,windfall,inflation) and deterministic annual projection. A full known profile skips durable inputs and asks only session details, filling to three with new forecast-specific context. tests/engine.test.ts exercises all six domains with0,2,and all durable facts known, plus exact zero-growth projection and invalid numeric rejection. This supersedes unconstrained ten-card experiments; a real UI ten-card drive remains a separate app gate.


## Superseded pre-short-flow rationale

## Why these caps

These are implementation hypotheses, not empirically optimal question counts. They correspond to inputs needed to make the prototype's assumptions inspectable.

| Topic / maximum missing inputs | Required inputs and purpose | Reading-time hypothesis |
|---|---|---|
| Money / 10 | Currency, assets, debt, monthly saving, years, return, savings growth, withdrawals, windfall, inflation: each changes the annual projection. | 80–150 seconds |
| Learning / 4 | Starting level, daily practice, feedback and deadline: identify the starting point, support and target. | 32–60 seconds |
| Relocation / 5 | Current and target cities, work flexibility, lease and cash runway: define the move and practical constraints. | 40–75 seconds |
| Growth / 3 | Current users, net weekly additions, weeks: the complete linear projection. | 24–45 seconds |
| Sports / 3 | Competition, future edition, contenders: define the event and available picks. | 24–45 seconds |
| World / 3 | Success definition, assumed conditions, additional context: make an ambiguous world question resolvable. | 24–45 seconds |
| General / 3 | Two current circumstances plus horizon, or three circumstances when horizon is already supplied. | 24–45 seconds |

Time ranges assume 8–15 seconds to read and select each card; they are untested human-burden estimates, not bot timings. Other text entry costs more. Follow-up interaction is defined in [UI rules](../../design/ui-rules.md#navigation-and-the-17-states). Known inputs are skipped; the captain's minimum of three adds fresh session context when fewer remain. Money is the deliberate ten-card stress case; do not shorten it by inventing financial inputs. user-test.md defines the actual completion/burden test and reversal criteria.
