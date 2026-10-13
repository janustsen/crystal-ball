# Current adaptive question policy

The engine returns one or two follow-ups. When at most two typed inputs are missing, it keeps the existing numeric/scenario engine and skips known values. Otherwise it asks one or two model-authored questions (reserving one card for a missing timeframe) and gives a qualitative prediction. It never fills missing numeric inputs with invented defaults. Personal model-authored cards address the asker as you/your and reject PersonName placeholders in questions or options. Person cards name the supplied first name instead. Invalid drafts have one repair then a recoverable error; `tests/reading-subject.test.ts` covers these subject constraints. Only personal questions use remembered context; see [profile and memory controls](../../README.md). Back truncates later answers. Typed Other answers and edited facts retain their existing validation.


Model-authored cards ask about a forecast-specific present fact, with short replies rather than statements about the asker. After structural and wording validation, `server/engine.ts` judges each card's normalized options with one model call per card: every option must directly answer the question on the same dimension. Cards are single-select; broad life questions ask about a current commitment or routine rather than a list of future goals. A mismatch passes the judge’s reason into the draft’s existing single repair, which may rewrite both question and options; an unvalidated replacement fails closed. Safety checks, drafting, answer checks and the single repair share a 110-second planning budget, below the app’s 120-second plan cancel. Budget exhaustion returns the recoverable “The mist is too thick” error; it never accepts unchecked cards. This model check is fallible, not a quality guarantee. `tests/reading-flow.test.ts` covers repair and rejection; `scripts/check-card-answers.mts` evaluates fixed cards with the real local judge. Recorded outputs and limitations are in the [phone-bug evidence](../evidence/phone-bugs-2026-10-10/README.md).

Card selection and transitions are local; the model runs at planning and reveal, not on every tap. The measured flow budgets and generation adoption gate are in decisions.md.

Historical policy experiments are retained separately in [the archive](archive/question-engine-history.md). They are not current caps or acceptance criteria.

## Current cap

One or two follow-ups is the product limit. The typed candidate registry may contain more inputs; it is not the user-visible plan. Complete inputs retain their numeric calculations. Incomplete inputs lead to a qualitative forecast. No new human-burden result is claimed; earlier estimates belong to the archive.
