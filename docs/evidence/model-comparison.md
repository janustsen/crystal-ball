# Local candidate comparison

Both candidates ran the same 20-case engine suite with explicit JSON schemas in the prompt and the experimental card relevance reviewer. Qwen3.5 9B completed 10/20, median total 23.90 seconds; Qwen3 4B instruct completed 10/20, median 5.22 seconds. Raw rows: engine-qwen35-9b.json and engine-qwen3-schema-prompt.json. These are completion counts, not semantic accuracy. Model swapping and diagnostic work could contend with the 9B run, so this is not an isolated latency benchmark.

The newer model was not adopted. Its initial schema-only invocation returned bare category words despite the format parameter; spelling the schema in the prompt fixed a focused reproduction, but did not deliver adequate full-suite reliability.

The card relevance reviewer was also not adopted. It rejected relevant present-context cards because they did not prove the future outcome. It cut completion from the prior 19/20 run to 10/20. A clarified prompt passed three curated fixtures (card-guard-focused.json), but its explanations still confused subjects. That is insufficient evidence to retain an extra blocking call. The experiment was removed; structural card validation, explicit relevance instructions, safety checks and the separate prediction consistency reviewer remain. Semantic card relevance remains a known limitation requiring human review in the final suite.

No hosted calls, paid calls or borrowed credentials were used. Both weights are stored in this task's ignored local model directory. The larger candidate can be replayed with OLLAMA_MODEL=qwen3.5:9b; default remains qwen3:4b-instruct-2507-q4_K_M.

## Reviewer-free follow-up
A second 9B replay used the matching later implementation without the card reviewer (the same implementation as engine-before-distinct-cards.json). It completed 13/20 with median 19.84 s versus 4B's 19/20 and 4.92 s. The 9B run had no competing inference stream; the earlier 4B run had some diagnostic/browser overlap, so latency is not a controlled ratio claim. Both raw suites remain available. The 9B failures include user growth, both sports cases, holiday, ex, technology job and old-friend reconnection. It was not adopted. This follow-up precedes the distinct-card, customer-routing and learning-copy corrections now under verification.

The 9B growth failure exposed wrong-type extra explanation fields. That server boundary was fixed, and bounded-explanation-qwen35.json records a successful real candidate replay with the exact 108-user calculation. Other candidate failures were not silently reclassified as passes. Later 4B grounding changes are documented separately in generation-review.md.
