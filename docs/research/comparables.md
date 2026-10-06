# Crystal Ball: category decisions

Research captured 2026-09-29, US storefront. This is a desk review of primary listings and visible reviews, not an installed-app walkthrough. Store ratings are popularity signals, not proof of prediction accuracy. Prices can vary by offer and region. No purchases, accounts, or private data were used.

| Comparable / primary source | Evidence | Product lesson for Crystal Ball |
|---|---|---|
| [Co–Star](https://apps.apple.com/us/app/co-star-personalized-astrology/id1264782561) | 4.8, 206K ratings. Daily personal readings, friend comparisons, push notifications, paid questions. Pro-Star $8.99/month; 5 questions $2.99, 10 $4.99, 25 $6.99. Expanded featured review dated 2024-08-11 says “The paying extra part is too expensive” and mentions repeated answers; see evidence/costar-review-excerpt.txt. Birth date/time are personalization inputs. | Keep memorable language and a daily return trigger. Avoid repetitions; retain past predictions. Show the entire first answer and why free. |
| [The Pattern](https://apps.apple.com/us/app/the-pattern/id1071085727) | 4.0, 15K ratings. Daily insights, relationship bonds, custom friends, premium content and time travel. $14.99 monthly / $83.99 annual. Featured 2020-10-15 review is titled “PLEASE fix this problem! But great app!”; the captured listing alone does not establish the issue’s current status. Listing does not prove current onboarding sequence. | Editable memory must actually persist. Friend context must remain separate from the owner's facts. Don't grow a general content subscription. |
| [Nebula](https://apps.apple.com/us/app/nebula-spiritual-guidance/id1459969523) | 4.6, 171K ratings. Horoscope, birth chart, tarot and advisor chat. Retained IAP evidence lists $2.99–$49.99 subscription SKUs without consistent periods, and $9.99 chat balance. Reviews are mixed personal testimonials; not verified accuracy evidence. [Official support](https://nebula-help-us.zendesk.com/hc/en-us/articles/47637969411473-Which-features-are-included) describes a premium popup after account access. | Display billing period next to price and an obvious close button. Credit packs should have an exact count, no chat-meter ambiguity. |
| [Tarot AI](https://apps.apple.com/us/app/tarot-card-readings/id1611588287) | 4.7 from only 23 ratings. Question-based AI tarot readings; annual premium mentioned but no verified current price captured. | Borrow the brief ceremony and export affordance; don't mistake tiny review volume for proven demand. |
| [Oracle Guru](https://apps.apple.com/us/app/fortune-teller-oracle-guru/id1667009693) | AI questions, daily/weekly/monthly forecasts, premium-only generation; insufficient ratings for an overview. Last listing update shown 2023-12-27. | Direct comparator but weak validation. Differentiate with grounded evidence and a useful free experience. |

## Onboarding and retention proposal

The original anonymous-entry and long-card-flow proposal and check-back-only notification permission recommendation are superseded by the [current reading, onboarding and notification usage](../../README.md). Offer Apple sign-in to preserve history after value is delivered. No contact upload.

The commercial wedge is accountable specificity: a date/number/pick, visible assumptions and source dates, and a later “Did it happen?” response. Avoid ominous mortality/illness statements and false claims of supernatural certainty. Sharing is opt-in and omits private answers. The current social surface follows the [social boundary](../social/model.md).

## Confidence and next evidence

Higher confidence: features and prices with retained primary excerpts; unverified Tarot/Oracle pricing and Nebula billing periods remain unknown. Medium: reviews identify plausible friction, but highlighted reviews are neither representative nor necessarily recent. Low: conversion, retention and willingness to pay for this exact product. Before public release, conduct five 18–24 user sessions: unaided ask completion, why comprehension, meaning of confidence, memory-edit success and willingness to share. Success hypothesis: 4/5 complete unaided and understand forecasts can be wrong; no participant mistakes demo billing for a charge.

Dated store snapshots and full-page captures are retained in evidence/{costar,pattern,nebula,tarot-ai,oracle-guru}-listing.txt and matching .jpeg images, captured with scripts/capture-comparables.py through chrome-devtools-axi. These are store pages, not installed onboarding or paywalls. Native competitor walkthroughs are unavailable tonight because Xcode is absent and no new accounts/purchases are authorized. The onboarding proposals above remain explicit design hypotheses, not observed competitor screen sequences. The five-session script is user-test.md.

## Audience proxy, not product validation

[Pew's survey published May 21, 2025](https://www.pewresearch.org/religion/2025/05/21/3-in-10-americans-consult-astrology-tarot-cards-or-fortune-tellers/) reports roughly one quarter of US adults aged 18–29 consult tarot annually; the overall adult figure for consulting astrology/tarot/fortune-tellers is 30%, generally for fun. Its representative fall-2024 survey supports an entertainment framing and a plausible young-adult audience, but 18–29 is not precisely 18–24 and it measures neither this app's demand nor subscription willingness. Sharing formats and $5.99 willingness-to-pay are still hypotheses. See user-test.md for explicit task/time/price-comprehension gates.

The review proxy sample is [review-sample.md](review-sample.md): all 11 unique visible reviews across the five store pages, with dates, coding and limitations. The earlier RSS attempt returned n=0 and remains a historical source failure in evidence/review-sample.json. Neither sample gives reviewer ages or representative complaint prevalence; Pew remains the only demographic proxy.

## Forecasting comparables beyond astrology

| Product / primary source | Relevant pattern | Crystal Ball decision |
|---|---|---|
| [Metaculus question-writing guidance](https://www.metaculus.com/question-writing/) and [approval checklist](https://www.metaculus.com/help/question-checklist/) | A question needs a clear outcome, deadline and resolution criteria; administrative resolution is distinct from a forecast. | Ask for a horizon when the user omits one. Keep the original question and let the owner mark the outcome. A self-reported “came true” is not verified accuracy. |
| [Manifold FAQ](https://docs.manifold.markets/faq) | Markets resolve under stated criteria, and disputed/ambiguous outcomes need explicit handling. | Keep Pending / Yes / Not quite separate. Do not present Sky resonance as predictive accuracy. No trading or wagering is in scope. |

These are closer comparables for accountable forecasts, not pricing substitutes for a consumer oracle. They support the check-back mechanic but do not validate demand for Crystal Ball's tone.

The complete visible-review proxy sample is now in [review-sample.md](review-sample.md): 11 deduplicated reviews across the five listing pages, with dates, coding and limitations. This supersedes relying only on the earlier two featured excerpts; the failed RSS attempt remains historical evidence.
