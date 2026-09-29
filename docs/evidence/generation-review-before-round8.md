# Manual semantic review of the final-repair replay

The 20-case engine replay completed 19/20; this is not a semantic pass. Ten general cases were inspected directly by the builder, not an independent human user. Raw cards, answers, headlines and Why text remain in engine-bakeoff.json.

| General case | Observed quality / remaining defect |
|---|---|
| Novel | Relevant writing cards; clear horizon; assumption mostly repeats progress evidence. |
| Holiday | Repair now asks completed preparations and preferences; clear forecast; calm experience is a speculative link. |
| Ex | Relevant cards; positive outcome assumes a future change in behavior rather than continuity of current facts. |
| Current town | Useful job/safety context, but transport is mixed into the safety card's options. |
| Technology job | Cards narrow the user to existing work/search activity; forecast fails closed after one repair. |
| Student election | Polling context is relevant; assumed vote-count options may not fit a user. Why's independence claim does not support the verdict. |
| Chess | Duplicate card questions and mixed subjects; Why incorrectly discounts a supplied opponent mistake and repeats itself. |
| Paris | Booking context relevant; today's weather is only relevant if the event is soon. Actual selected event was this week. |
| Old friend | Contact context relevant, but a photo is not a place under the where card. All options presume recent contact; Other is available. |
| Marathon | Running context relevant; shoe condition is weak evidence. Why treats unknown marathon preparation as absence. |

These defects prevent claiming grounded general-purpose prediction quality or an earned 9/10. The separate consistency reviewer catches some malformed or contradictory results but misses these semantic problems. The prototype does not claim calibrated likelihood or future accuracy. No fabricated fallback replaces rejected output, and errors do not spend a reading. The broad card reviewer experiment reduced completion to10/20 and was removed; its failure is also retained.
