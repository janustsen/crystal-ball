# Ask

## Sub-features
Typed and suggested questions; voice fallback; 1–2 adaptive cards with Other; known-fact skip; definitive reveal with Due date; short/Plus Why; first-name Person reading with [all-age output safeguards](../../../../docs/research/safety-policy.md); safety and timeout.

## How to get to it (user POV)
Home orb or raised Ask tab; see [Sky and Circles](social.md) for suggested-question entry. Home whispers are decorative and never block the orb.

## Driving it with chrome-devtools-axi
Home orb opens the approach animation and voice. Type instead opens a four-line Your question editor; About myself · change opens a dedicated subject/name editor. Save validates and commits; Cancel changes restores the original identity. Both return focus to the composer without changing the question. scripts/check-identity-editor.mjs covers normal/200% draft, validation, cancellation and focus. Ask the Ball submits. Standard options immediately advance; In my own words opens a typed answer with persistent question context and Continue / Reveal. Back to choices restores focus and retains the draft; a compact question layout keeps context and action visible in short viewports. Back returns to the prior card; Close exits to Home. Capture the one or two returned follow-ups, thinking, reveal and Why. The reveal’s Check back date is a readable calendar date; stored due dates remain unchanged. Free Why opens immediately with Back to forecast at the top; readers hide forecast/check-in actions and use the quieter utility atmosphere; Plus shows an evidence overview and four dedicated readers. All evidence returns focus to its category; Back to forecast restores the original control. scripts/check-compose-read.mjs verifies content, focus, enlargement and access boundaries. Repeat with a sensitive request. scripts/drive-design.mjs and scripts/drive-design-recovery.mjs cover the flow, cancel, retained answers and actual 60-second timeout.

## Gotchas
Real Ollama required. Errors spend no credit. The engine selects one or two cards, skips known typed values and uses qualitative generation when numeric inputs are incomplete.
