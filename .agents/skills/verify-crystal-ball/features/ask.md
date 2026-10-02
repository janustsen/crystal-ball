# Ask

## Sub-features
Typed and suggested questions; voice fallback; 1–2 adaptive cards with Other; known-fact skip; definitive reveal with Due date; short/Plus Why; first-name Person reading with [all-age output safeguards](../../../../docs/research/safety-policy.md); safety and timeout.

## How to get to it (user POV)
Home orb or raised Ask tab; see [Sky and Circles](social.md) for suggested-question entry. Home whispers are decorative and never block the orb.

## Driving it with chrome-devtools-axi
Home orb opens the approach animation and voice. Type instead opens a four-line Your question editor; About myself · change opens the subject/name controls. Ask the Ball submits. Standard options immediately advance; In my own words opens a typed answer and Continue / Reveal. Back returns to the prior card; Close exits to Home. Capture the one or two returned follow-ups, thinking, reveal and Why. Free Why opens immediately; Plus shows an evidence overview and four dedicated readers. All evidence returns focus to its category; Back to forecast restores the original control. scripts/check-compose-read.mjs verifies content, focus, enlargement and access boundaries. Repeat with a sensitive request. scripts/drive-design.mjs and scripts/drive-design-recovery.mjs cover the flow, cancel, retained answers and actual 60-second timeout.

## Gotchas
Real Ollama required. Errors spend no credit. The engine selects one or two cards, skips known typed values and uses qualitative generation when numeric inputs are incomplete.
