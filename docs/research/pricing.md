# Pricing recommendation (USD, prototype hypothesis)

Use 1 free prediction/day, Plus at $1.99/week, $5.99/month or $39.99/year (10 predictions/day), and non-expiring 5-credit / $1.99 and 20-credit / $5.99 consumable packs. One credit buys one successful prediction, not one question card. Blocked, failed and cancelled requests cost nothing. Daily allowance is used before purchased credits; Plus allowance replaces the free allowance. Purchased credits survive subscription changes. Do not advertise unlimited usage.

[Co–Star's store listing](https://apps.apple.com/us/app/co-star-personalized-astrology/id1264782561) anchors paid questions at $0.28–$0.60 each and subscriptions at $8.99/month. [The Pattern](https://apps.apple.com/us/app/the-pattern/id1071085727) lists $14.99/month and $83.99/year. Our lower initial price reflects narrower scope and an unproven product, not established willingness to pay. Packs at $0.30–$0.40 each sit inside that question range. Annual saves 44% versus twelve $5.99 months; display the actual $39.99 annual charge prominently.

[RevenueCat's 2026 report](https://www.revenuecat.com/state-of-subscription-apps) reports higher D35 conversion for hard paywalls (10.7% versus 2.1% freemium), but discusses freemium's role in word of mouth. Those observational cross-app medians do not establish causality or forecast our conversion. The brief's UGC requirement favors a free complete first reveal; do not paywall the explanation of an answer already earned.

## Unit economics, with explicit assumptions

Budget a normal prediction at 8,000 input + 1,000 output tokens across planning, cards and reveal. [Together pricing](https://www.together.ai/pricing) lists Qwen3.5 9B at $0.17/$0.25 per million input/output: $0.00161 per prediction before search, retries, hosting and taxes. Qwen3.8 Flash is listed at $0.09/$0.28: $0.00100 on the same assumed token budget. Treat these as candidates until provider access and evaluation, not a selected production SLA.

A pessimistic $0.03 total cost/prediction, 300 monthly Plus predictions and a modeled 30% store fee produces $4.19 net revenue minus $9 usage: a loss. At measured-model-only $0.00161, 300 cost $0.48. Therefore costs and quotas need monitoring before launch; no paid deep research by default. Store fee is a sensitivity assumption, not a claim of Janus's program eligibility. At 30 predictions/month and $0.03 total each, contribution is $3.29 before fixed costs. Free daily active users could cost $0.90/month at that same pessimistic rate.

## Paywall rules and test

Preselect Weekly. Show weekly, monthly and annual charges with their billing periods, the weekly annual equivalent ($103.48 for 52 weeks), exact daily cap, cancel/restore routes, privacy and terms, packs as a separate “No subscription” option, and a visible close action. No fake urgency or preselected free trial. Prototype purchase actions say “simulate”; they change a local mock balance and charge nothing. Production prices must come from RevenueCat offerings. Server receipt/webhook credit accounting is required before real commerce.

Evaluate $5.99 versus $7.99 only after users can complete the core flow. Track paid conversion, 7-day return, successful generations, per-user variable cost, refunds, share completion and cancellations without collecting question text. Guardrails: <$0.01 normal generation cost and no charged failed predictions. These are targets, not observed results.

The 8K/1K budget above is an initial sizing assumption for repeated context across up to ten cards, not the ~150-token reveal-only fixtures. Those historical flows do not represent the [current question policy](question-engine.md); remeasure the current planning and reveal calls before updating sizing. Tonight inference runs on the Mac server, accessed by Expo web over loopback. A physical phone later uses the Mac's LAN IP on trusted Wi-Fi; production uses authenticated hosted inference, not a developer laptop. This deployment change needs a fresh cost and privacy review. Price sensitivity for students/young workers is unmeasured; see user-test.md.

## Measured local call-budget update

The completed 4B scripted flow uses 1,361 input / 321 output tokens for 3 cards (11.05s), 2,227 / 476 for 6 (14.90s), and 3,890 / 699 for 10 (22.19s), including planning and reveal. These are end-to-end model-call sequences over loopback, excluding human time, UI and live network search. Their poor repeated questions are documented, so these are cost measurements, not UX passes. These historical measurements predate the [current question policy](question-engine.md); measure the actual app again before launch.

Repriced at Together Qwen3.5 9B's listed rates as a sizing estimate (tokenizers may differ): $0.000312 / $0.000498 / $0.000836 for those flows. Doubling the largest observed budget for one full retry gives $0.001672; 300 such predictions cost about $0.50 of model inference, before search and hosting. This supports the original order-of-magnitude budget, not a production margin guarantee. The pessimistic $0.03 all-in scenario remains a useful loss boundary. On-device inference is not assumed.

The displayed plans are captain-selected **prototype prices**, not audience-validated willingness to pay. They do not block prototype design because tonight no real purchases occur. Before real pricing: in the five qualitative sessions, if fewer than 4/5 can recall both total charge and billing period, fix the paywall before testing price. For a later randomized opt-in pricing pilot (at least 200 eligible users/arm, budget separately authorized), reject $7.99 if 7-day conversion falls >25% relative without greater net revenue per eligible user; stop both paid variants if refund/charge-confusion exceeds 5% or normal variable cost exceeds $0.03. Small samples are directional; do not claim statistical significance without a power analysis.

Production launch gate for this price: measured all-in variable cost must stay at or below $0.010 per successful prediction, including retrieval, repairs and hosting allocation. At 300 monthly uses that caps cost at $3, below the assumed 30%-fee net $4.19. Above that ceiling, do not activate paid Plus at these terms; keep the local/mock prototype until pricing or supply changes are reviewed. This closes the pessimistic $0.03 loss scenario without pretending it is viable. No customer has bought this prototype offer.

## Free-user subsidy and annual-plan constraint

At the $0.010 ceiling, a max-use monthly subscriber costs $3, leaving $1.193 after a modeled 30% store fee. A free user consuming all 30 daily readings costs $0.30/month. One such subscriber supports only 3.98 such free users: break-even paid share is about 20.1%, before fixed overhead. At 60 paid readings and five free readings per month, the same calculation gives about 1.37% paid share. Neither usage scenario is measured; a daily cap is not expected utilization.

The annual offer is tighter: $39.99 × 70% / 12 = $2.333 monthly-equivalent net. At 300 readings, the $0.010 ceiling loses money even before free users. Therefore the annual mock offer **must not be activated** unless measured all-in average cost is at most $0.007 per reading and cohort contribution (including free users) is positive. Otherwise revise the annual price or allowance before billing. The UI is a test offer, not a claim these economics work.

The 20-pack and monthly Plus both cost $5.99. This is intentional segmentation: a pack expires neither daily nor monthly and suits occasional use; Plus suits repeated use. It may cannibalize subscriptions, which is acceptable only if contribution per eligible user improves. The pricing pilot must measure pack and subscription contribution together, not optimize subscription conversion alone.

## Hosted replay budget including retrieval and repair

These are estimates from the historical 3/6/10-card token counts, one full-budget repair, one $0.005 Brave query and a **planning allocation**, not measured hosting cost, of $0.002. Listed rates are sourced above; provider tokenization and actual app calls must be replayed before billing.

| Provider | 3-card total | 6-card total | 10-card total | Monthly $0.010 gate / annual $0.007 gate |
|---|---:|---:|---:|---|
| Together Qwen3.5 9B | $0.007623 | $0.007995 | $0.008672 | Monthly clears estimate; annual fails |
| Together Qwen3.8 Flash | $0.007425 | $0.007667 | $0.008092 | Monthly clears estimate; annual fails |
| Groq Qwen3.8 27B | $0.011746 | $0.014371 | $0.018816 | Both fail |

This rules out a paid search on every annual-tier reading at these conservative allocations. It does not justify silently removing research; pricing/supply needs another decision before paid launch.
