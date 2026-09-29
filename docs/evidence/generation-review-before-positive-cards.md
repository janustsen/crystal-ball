# Current generation review

The current local 4B replay completes 20/20, including 11 general cases. Planning p50/p95 is 2.60/4.99 s; prediction 1.92/2.98 s; total 4.57/7.05 s. Inference was sequential before the browser drive. These are completion and latency measures, not predictive accuracy.

The model selects an existing input key as its factual basis. The server quotes that value verbatim, then labels the model's future condition as a speculative assumption. A model-authored factual paraphrase can no longer appear in Why. The same rule protects deterministic explanations from schema-extra fields. Tests include an invalid basis key repaired once, invented prose ignored, and bounded outputs with wrong-type extra fields.

The experimental consistency checker rejected plausible future conditions for lacking proof, as owned-basis-diagnosis.json shows for the election and ex cases. Keeping it reduced completion to 12/20. It was removed after factual provenance became server-owned. Sensitive-topic phrase rules/classification still run on input, generated cards and output; structural bounds, number validation and the one-repair limit remain. Current input/output safety is unchanged. No rejected text is used as a fallback.

| General case | Current semantic observation |
|---|---|
| Novel | Writing cards relevant; weekly progress is quoted exactly. The future condition is repetitive and weaker than a full completion model. |
| Holiday | Repaired preparation/preference cards; exact preference quote plus continuation of quiet-location preference. |
| Ex | Negative verdict matches ongoing daily thoughts. The assumption largely repeats the verdict and present fact. |
| Current town | Exact safety input quoted, with continued safety/routine assumed. Transport remains mixed into the safety card's alternatives. |
| Technology job | Exact scheduled-interview input plus continued job search; prior truncated factual prose is gone. |
| Student election | Positive verdict uses the actual 60% poll-support answer and assumes continued lead/engagement. Vote-count alternatives still presume an ongoing count. |
| Chess | Questions are distinct after repair; exact openings-practice input plus continued practice. Some options still mix preparation and time, or preference and experience. |
| Paris | Exact hotel-booking input plus staying in that booking this week. Weather card relevance depends on event timing. |
| Old friend | Exact incoming-text input plus a response assumed. A photo still appears under a where card, a remaining option mismatch. |
| Customers | Correct customer subject, exact website-launch input and continued site visibility. No calibrated customer-conversion model. |
| Marathon | Exact daily-training input; continued training despite worn shoes assumed. Shoe condition is a weak question. |

This inspection is by the builder; fresh independent grader files supply the separate reviews. The narrower offline card checker only agreed with 7/11 manual labels and rejected valid event timing, so it was not shipped. The remaining option mismatches and weak/tautological future conditions prevent claiming a clean semantic suite or calibrated forecasts.
