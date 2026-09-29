# Manual semantic review after distinct-card repair

The latest20-case replay completed19/20. It now contains11 general cases because customer questions correctly leave the user-count template. This is builder inspection, not an independent human study or a semantic pass. Current raw artifacts: engine-bakeoff.json. Earlier inspection: generation-review-before-round8.md.

| Case | Observation |
|---|---|
| Novel | Relevant cards and clear verdict; Why's assumption repeats the inputs. |
| Holiday | Completed preparations/preferences now replace future guesses; positive forecast is tied to stated preferences. |
| Ex | Relevant cards; Why still infers eventual closure from ongoing contact without supporting evidence. |
| Current town | Fails closed; its safety card still includes transport as an option. |
| Technology job | Completes, but Why overinterprets activity and ends with an incomplete fragment. |
| Student election | Negative verdict despite60% support; Why confuses lack of certainty with evidence against winning. |
| Chess | Duplicate cards are repaired, but options still mix preparation/time and preferences/experience. Why denies any factual link rather than explaining the pick. |
| Paris | Booking and this-week weather support the stated scenario; no predictive accuracy claim. |
| Old friend | Contact context relevant; a photo is still not a place under a where card. |
| Customers | Correctly forecasts customers, with project-launch/client-contact cards; explanation is repetitive. |
| Marathon | Positive scenario based on daily running; weak shoe question remains; merged Why is labelled only as an assumption. |

Planning p50/p95:2.81/5.60 seconds; prediction p50/p95:4.18/7.45 seconds; total p50/p95:7.30/12.84 seconds. This replay preceded browser inference, so there was no competing app model stream. It includes a cold transition from9B back to4B. A later one-line bounded-explanation guard does not change these general outputs; it is covered by the failing-then-passing regression; a targeted candidate replay is pending.

The code now enforces distinct card text and preserves the requested conversational language target. Those mechanical improvements do not solve all option relevance or causal reasoning defects. Errors still receive one repair, spend no credit and offer retry/edit. No invented fallback is used to achieve20/20.
