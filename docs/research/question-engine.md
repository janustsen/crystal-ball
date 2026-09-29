# Current adaptive question policy

The authoritative caps are in [decisions.md](decisions.md): money 10, learning 4, relocation 5, growth 3, sports 3, world 3, general 3. Every session asks 3–10 new cards; known durable facts and facts stated in the question are skipped. `src/questions.ts` owns the registry, required inputs and sport-dependent options. General questions receive three model-authored contextual cards, with one repair then a recoverable error; there is no invented fallback. Back truncates later answers. Only successful personal readings learn durable facts. `src/questions.ts` also owns answer validation: free-text Other answers for quantities are validated, and duration cards (savings runway in months, daily practice in minutes) must carry a recognized unit, so unparseable text is re-asked instead of being read as zero. The same validation runs when a fact is edited in You, and a remembered fact that no longer validates is dropped and its card asked again.

Card selection and transitions are local; the model runs at planning and reveal, not on every tap. The measured flow budgets and generation adoption gate are in decisions.md.

Historical policy experiments are retained separately in [the archive](archive/question-engine-history.md). They are not current caps or acceptance criteria.

## Why these caps

These are implementation hypotheses, not empirically optimal question counts. They correspond to inputs needed to make the prototype's assumptions inspectable.

| Topic / maximum missing inputs | Required inputs and purpose | Choice/Next taps; reading-time hypothesis |
|---|---|---|
| Money / 10 | Currency, assets, debt, monthly saving, years, return, savings growth, withdrawals, windfall, inflation: each changes the annual projection. | 20; 80–150 seconds |
| Learning / 4 | Starting level, daily practice, feedback and deadline: identify the starting point, support and target. | 8; 32–60 seconds |
| Relocation / 5 | Current and target cities, work flexibility, lease and cash runway: define the move and practical constraints. | 10; 40–75 seconds |
| Growth / 3 | Current users, net weekly additions, weeks: the complete linear projection. | 6; 24–45 seconds |
| Sports / 3 | Competition, future edition, contenders: define the event and available picks. | 6; 24–45 seconds |
| World / 3 | Success definition, assumed conditions, additional context: make an ambiguous world question resolvable. | 6; 24–45 seconds |
| General / 3 | Two current circumstances plus horizon, or three circumstances when horizon is already supplied. | 6; 24–45 seconds |

Time ranges assume 8–15 seconds to read and select each card; they are untested human-burden estimates, not bot timings. Other text entry costs more. Known inputs are skipped; the captain's minimum of three adds fresh session context when fewer remain. Money is the deliberate ten-card stress case; do not shorten it by inventing financial inputs. user-test.md defines the actual completion/burden test and reversal criteria.
