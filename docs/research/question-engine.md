# Current adaptive question policy

The engine returns one or two follow-ups. When at most two typed inputs are missing, it keeps the existing numeric/scenario engine and skips known values. Otherwise it asks one or two model-authored questions (reserving one card for a missing timeframe) and gives a qualitative speculative forecast. It never fills missing numeric inputs with invented defaults. Personal model-authored cards address the asker as you/your and reject PersonName placeholders in questions or options. Person cards name the supplied first name instead. Invalid drafts have one repair then a recoverable error; `tests/reading-subject.test.ts` covers these subject constraints. Only personal questions use remembered context; see [profile and memory controls](../../README.md). Back truncates later answers. Typed Other answers and edited facts retain their existing validation.


Card selection and transitions are local; the model runs at planning and reveal, not on every tap. The measured flow budgets and generation adoption gate are in decisions.md.

Historical policy experiments are retained separately in [the archive](archive/question-engine-history.md). They are not current caps or acceptance criteria.

## Current cap

One or two follow-ups is the product limit. The typed candidate registry may contain more inputs; it is not the user-visible plan. Complete inputs retain their numeric calculations. Incomplete inputs lead to a qualitative forecast. No new human-burden result is claimed; earlier estimates belong to the archive.
