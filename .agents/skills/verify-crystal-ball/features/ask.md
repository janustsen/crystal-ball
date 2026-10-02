# Ask

## Sub-features
Typed and suggested questions; voice fallback; 3–10 cards with Other; known-fact skip; definitive reveal; Why; safety and timeout.

## How to get to it (user POV)
Home orb or raised Ask tab; see [Sky and Circles](social.md) for suggested-question entry. Home whispers are decorative and never block the orb.

## Driving it with chrome-devtools-axi
Home orb opens the approach animation and voice. Type instead opens Your question; Ask the Ball submits. Standard options immediately advance; In my own words opens a typed answer and Continue / Reveal my prediction. Back returns to the prior card; Close exits to Home. Capture all three follow-up layouts, thinking, reveal and Why. Repeat with a sensitive request. scripts/drive-design.mjs and scripts/drive-design-recovery.mjs cover the flow, cancel, retained answers and actual 60-second timeout.

## Gotchas
Real Ollama required. Errors spend no credit. Minimum three is new session context, not repeated known personal facts.
