# Ask

## Sub-features
Typed and suggested questions; voice fallback; 1–2 adaptive cards with Other; known-fact skip; definitive reveal with Due date; short/Plus Why; first-name Person reading with [all-age output safeguards](../../../../docs/research/safety-policy.md); safety and timeout.

## How to get to it (user POV)
Home orb or raised Ask tab; see [Sky and Circles](social.md) for suggested-question entry.

## Driving it with chrome-devtools-axi
Home orb opens the approach animation and voice. Type instead writes the question into the ball (`question-input`); the mic (`speak-instead`) returns to voice and Ask the Ball submits with the plunge. `PREVIEW_URL=<owned preview> node scripts/check-ask-fit.mjs` checks that every typing control remains reachable above an emulated keyboard at 375–440 px and large text, with scrolling only when the content cannot fit; the native keyboard frame still needs a Simulator drive. Standard options immediately advance; In my own words opens a typed answer and Continue / Reveal my forecast. Back returns to the prior card; Close exits to Home. Capture the one or two returned follow-ups, thinking, reveal and Why. Repeat with a sensitive request. See the [verification skill](../SKILL.md) for flow and recovery drivers.

## Gotchas
Real Ollama required. Check interruption and retry behavior against [user guidance](../../../../README.md). The engine selects one or two cards, skips known typed values and uses qualitative generation when numeric inputs are incomplete.
