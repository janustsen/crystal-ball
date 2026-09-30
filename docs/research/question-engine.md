# Current adaptive question policy

The engine returns one or two follow-ups. When at most two typed inputs are missing, it keeps the existing numeric/scenario engine and skips known values. Otherwise it asks one or two model-authored questions (reserving one card for a missing timeframe) and gives a qualitative speculative forecast. It never fills missing numeric inputs with invented defaults. General drafts have one repair then a recoverable error. Onboarding birthday and current focus are optional editable You facts; only personal questions use that context. Back truncates later answers. Typed Other answers and edited facts retain their existing validation.


Card selection and transitions are local; the model runs at planning and reveal, not on every tap. The measured flow budgets and generation adoption gate are in decisions.md.

Historical policy experiments are retained separately in [the archive](archive/question-engine-history.md). They are not current caps or acceptance criteria.

## Why these caps

These are implementation hypotheses, not empirically optimal question counts. They correspond to inputs needed to make the prototype's assumptions inspectable.

| Topic / maximum missing inputs | Required inputs and purpose | Reading-time hypothesis |
|---|---|---|
| Money / 10 | Currency, assets, debt, monthly saving, years, return, savings growth, withdrawals, windfall, inflation: each changes the annual projection. | 80–150 seconds |
| Learning / 4 | Starting level, daily practice, feedback and deadline: identify the starting point, support and target. | 32–60 seconds |
| Relocation / 5 | Current and target cities, work flexibility, lease and cash runway: define the move and practical constraints. | 40–75 seconds |
| Growth / 3 | Current users, net weekly additions, weeks: the complete linear projection. | 24–45 seconds |
| Sports / 3 | Competition, future edition, contenders: define the event and available picks. | 24–45 seconds |
| World / 3 | Success definition, assumed conditions, additional context: make an ambiguous world question resolvable. | 24–45 seconds |
| General / 3 | Two current circumstances plus horizon, or three circumstances when horizon is already supplied. | 24–45 seconds |

Time ranges assume 8–15 seconds to read and select each card; they are untested human-burden estimates, not bot timings. Other text entry costs more. Follow-up interaction is defined in [UI rules](../design/ui-rules.md#navigation-and-the-17-states). Known inputs are skipped; the captain's minimum of three adds fresh session context when fewer remain. Money is the deliberate ten-card stress case; do not shorten it by inventing financial inputs. user-test.md defines the actual completion/burden test and reversal criteria.
