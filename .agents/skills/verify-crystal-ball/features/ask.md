# Ask

## Sub-features
Typed and suggested questions; voice fallback; an immediate relevant opening card and ready tailored cards with Other; known-fact skip; definitive reveal with Due date; short/Plus Why; Love timing (adults: the Ball names the date; gold-sealed History shelf); first-name Person reading with [all-age output safeguards](../../../../docs/research/safety-policy.md); safety and timeout.

## How to get to it (user POV)
Home's ball (`hero-orb`) or Tap to ask (`tap-to-ask`); see [Sky and Circles](social.md) for suggested-question entry.

## Driving it with chrome-devtools-axi
Home orb opens the approach animation and voice. Type instead writes the question into the ball (`question-input`); the mic (`speak-instead`) returns to voice and Ask the Ball submits with the plunge. `PREVIEW_URL=<owned preview> node scripts/check-ask-fit.mjs` checks that every typing control remains reachable above an emulated keyboard at 375–440 px, with scrolling only when the content cannot fit; run it once more against a preview started with `EXPO_PUBLIC_AI_PROVIDER_NAME` set so the AI permission switch and What’s shared link are checked too. The native keyboard frame still needs a Simulator drive. Standard options advance with the [Answer pick feedback](../../../../docs/design/motion-language.md); In my own words opens a typed answer and Continue / Reveal my prediction. Back returns to the prior card; Close exits to Home. Capture the immediate first card, any appended tailored cards, thinking, reveal and Why. Repeat with a sensitive request. See the [verification skill](../SKILL.md) for flow and recovery drivers.

`VERIFY_URL=<owned preview> node scripts/drive-love-timing.mjs` drives Love timing against the real engine: no teen offer, no horizon card, the model-picked date on the reveal and the shelf, and a saved check-in.

## Gotchas
Real Ollama required. Check interruption and retry behavior against [user guidance](../../../../README.md). The opening card needs no model call. The engine still selects and validates one or two tailored cards; they append only if ready when the opening answer is submitted. A late or failed plan never blocks the forecast. Known typed values are skipped; incomplete numeric inputs use qualitative generation.

Run `PREVIEW_URL=<owned preview> EVIDENCE_DIR=<owned dir> node scripts/verify-opening-plan.mjs` for held planning, append/Back/answer retention, and `node scripts/verify-thinking-mist.mjs` for sub-second first cards, moving loading light, reduced motion and Cancel. These deliberately hold/fail the request boundary, so real readings remain required.
