# Findings to address after comparison

- src/questions.ts factLabels omits horizon, so an actual inferred horizon becomes Answer3 in the captured real reading. Add a known semantic label; do not infer missing historic original prompts.
- server/engine.ts initializes assumptions with disclaimers. General output separately records result.assumption in reasonSections but does not include it in the assumptions collection. Preserve the disclaimer in the existing qualifier/limits; expose actual scenario conditions and honest empty state. Historic records require exact known boilerplate handling, never heuristic deletion of meaningful assumptions.
- CheckInForecast initial state says Choose again before an outcome exists. Derive untouched/unsaved/saved guidance from draft versus stored outcome.
- DailyOmen hides consumed-attempt context in its policy disclosure, and storage error recovery says shortly despite known60s refresh. Make these states explicit within the existing Home fit constraints.
- BirthProfile unknown time should provide a direct exit, preserving stored birthday and existing draft/cancel behavior. Current city loading/results/no-match/error proof must enter the final deck rather than only a runtime assertion.
- Review asks for switch keyboard/status evidence, share invite/reminder boundary outcomes, named-person empty validation, birthday invalid-field associations and large-text birth-chart stress. These are verification gaps, not automatic proof of product defects.
