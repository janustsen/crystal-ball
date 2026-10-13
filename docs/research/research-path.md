# Live research path

Use light retrieval for tonight: fixed public-topic queries against Google News RSS only, maximum three relevant results, 8-second fetch deadline, preserve source URL/title/date and retrieved-at time. Never send personal answers, names, income or a friend's identity to a search engine. Generate a short public-topic query separately. Headline RSS is a lead, not full-article verification: label it “news headlines” in Why, never “deep research.” If sources fail or do not match the topic, say so and allow retry or a context-only forecast with explanation wording governed by the [voice guide](../voice.md).

## Probe on this Mac, 2026-09-29

Reproducible transport observations: [search-probe.json](evidence/search-probe.json). Query: US inflation outlook.

| Source | Observation | Decision |
|---|---|---|
| Google News RSS | 200, 0.58s; parsed relevant late-September 2026 inflation headlines from Yahoo/Bloomberg/Morningstar | Usable for dated leads, deduplicate syndicated stories; no accuracy claim from title alone. Public feed is not a commercial search SLA. |
| Wikipedia API | 200, 0.25s; search returned articles | Background definitions, not future-event evidence. Fetch extracts only for matching topic. Attribute Wikipedia and retain URL. |
| Bing RSS | 200, 0.19s; results mostly matched “US” rather than inflation; response explicitly restricts reuse to personal noncommercial RSS | Reject for app engine. Transport success is not quality or permission. |
| DuckDuckGo HTML | 202, 0.17s; anomaly/CAPTCHA page | Reject; do not automate around challenge. |

## Free deep research options

[SearXNG](https://docs.searxng.org/dev/search_api.html) can self-host metasearch with JSON enabled; many public instances disable JSON and upstream engines rate-limit. It removes a search-vendor subscription, not compute or reliability costs. [LangChain Deep Agents](https://docs.langchain.com/oss/python/deepagents/overview) offers an open-source agent framework; inference and search are still separately provisioned. A local Qwen loop can generate two subqueries, retrieve, summarize contradictions, then synthesize. No hosted “free deep research” account is authorized here.

Historical proposed experiment, now dropped for this prototype: compare deep mode against light using the same ten cases: light = one public query, up to six leads, one synthesis; deep = two queries, up to six unique sources, two synthesis passes, bounded at 60 seconds. Score relevant evidence, date correctness, contradiction handling, latency and invented-source count. Deep is not justified if it merely repeats headlines. Do not implement deep mode tonight. The executed one-case pilot below did not justify its extra latency; reopening it requires a separate measured benefit. Paywalls and robots/terms restrictions are not bypassed. Production needs a licensed provider or reviewed public-source policy before commercial traffic.

## Grounding contract

Returned sources are server-owned, never URLs invented by the LLM. Why separates supplied personal facts, source-derived claims, and assumptions. A source must be topically relevant to count as grounding. Retrieval text is untrusted data and cannot issue tool instructions. No model browsing or arbitrary URL fetch tool. If evidence conflicts, the headline remains one best forecast while Why exposes the conflict. Certainty of phrasing must never become a claim of certainty about the future.

## Expanded retrieval audit

`scripts/search-expanded.py` now captures five public queries (inflation, football, San Francisco events, language learning, EVs), provider URLs, UTC retrieval timestamps and three parsed results per provider in [search-expanded.json](evidence/search-expanded.json). These observations are small-sample relevance checks, not reliability statistics.

| Query | Google News top-three relevance | Wikipedia top-three relevance |
|---|---|---|
| Inflation outlook | Two versions of the same Bessent headline are relevant but syndicated; Nomura title alone is ambiguous. 2/3 topic matches, only one distinct clear story. | Headline inflation and inflation surge are background; Iran-war economics needs extraction to assess. |
| World Cup football | All three are FIFA leadership/dispute news, not evidence for a winner prediction. 0/3 outcome-relevant. | World Cup, 2010 and Women's World Cup require tournament/year disambiguation; none proves current team strength. |
| San Francisco events October | Two October lists relevant; September events wrong month. 2/3. | Armory, a video game and city page: 0/3 event-relevant. |
| Language learning practice | Two app roundups are weak evidence for learning efficacy; Northeastern evening-practice story relevant. 1/3 strong match. | Disambiguation weak; second-language acquisition and computer-assisted learning relevant background. |
| EV adoption | ICCT, copper-demand and Europe sales headlines all topical; geography differs. 3/3 topic matches, not interchangeable forecasts. | All three related background definitions/adoption pages. |

This rules out indiscriminate “we researched it” claims. Filter by topic and geography; surface evidence quality and do not infer outcome data from sports governance headlines. If retrieval cannot support the question, the result is a context-based prediction or a retry; wording follows the [voice guide](../voice.md). Search is prototype-only: Google News RSS availability does not establish a commercial content license. [Google's terms](https://policies.google.com/terms) do not waive third-party content rights and restrict automation contrary to machine-readable instructions. No commercial permission or guaranteed feed availability is claimed. Production must replace this with a licensed source before public rollout.

Bing's response [URL](https://www.bing.com/search?format=rss&q=US+inflation+outlook) restricts results to “personal, non-commercial use” and requires “express written permission” for other uses. Those short phrases are the relevant terms evidence; Bing is not in the generation engine.

## Executed bounded-deep pilot

`scripts/deep-research-pilot.py` compares one query/one synthesis with two region-specific queries/two syntheses for global EV adoption using local 4B. Raw fetched leads, query strings, prompts in script, token counts and answers are in evidence/deep-pilot.json. This is one experiment, not the ten-case deep benchmark described above. It remains headline aggregation, not article-level deep research. The extra synthesis does not magically add verified evidence; the output still hedges and generalizes region-specific trends. Keep light default and spend effort on relevance checks rather than adding an agent framework. Use the recorded timings below as observed one-run values, not an SLA.

- light: 3.839 seconds, 768 input tokens, 80 output tokens, 3 headline leads.

- bounded-deep: 11.164 seconds, 2794 input tokens, 200 output tokens, 6 headline leads.

Additional observed failure: light synthesis calls 2026 headlines “not current” even though the run is in 2026. Every production synthesis must receive an explicit current date and source dates; the UI derives “retrieved today” from server timestamps, never a model's date judgment. The deep run's 52% number appears in one source title, but cannot be promoted to a verified global adoption statistic. The app should display source leads separately from its own inference.

## Executable decision rule for the app

A lead is eligible only if its title matches the public topic and, when the user has specified geography or an event edition, that geography/edition is not contradicted. Deduplicate normalized titles and source URLs. News older than 180 days is background, not current-outcome evidence. Wikipedia is always background. For a sports winner, governance headlines fail outcome relevance even if “FIFA” matches the topic. Do not promote a lead to a claim of verified facts. If fewer than two distinct outcome-relevant leads remain, label the evidence limited; allow an explicit context-only path rather than silently claiming full research.

Retrieval rubric used by the independent reviewer: 1 point topic match, 1 point geography/time match when applicable, 1 point usefulness for the requested future outcome. Per-provider maximum 45 over 15 leads. A high title score still is not article verification. App implementation may use model-assisted relevance tagging, but the source list, dates and links must come from retrieval, not the model.

Independent follow-up review scored the 15 Google News leads 36/45 and Wikipedia 24/45 under its three-part rubric; see evidence/followup-independent-review.txt for per-query scores and caveats. It independently confirms duplicate inflation stories, irrelevant sports-politics leads, and the SF Wikipedia failure. Wikipedia edit timestamps are not content publication dates. A September retrieval timestamp on a January-sales headline does not make the sales current. These findings reinforce the limited-headlines label and semantic date/region checks.

## Current implementation choice
Only Google News headline leads were selected for the prototype. Wikipedia remains an evaluated alternative, not a live implementation claim. Queries contain a fixed public topic or competition/edition, never raw personal question text or private answers. Personal scenarios explicitly state that no external evidence proves the future outcome. The actual server's lexical filter is stricter than the original probe; its precision still requires generation review.

## Production candidate and cost gate (checked 2026-09-29)

Brave Search API is a candidate, not configured or called. Its [current official announcement](https://brave.com/blog/most-powerful-search-api-for-ai/) prices Search/LLM Context at $5 per 1,000 requests, with $5 monthly credit. One query therefore costs $0.005 before inference and hosting: half the $0.010 ceiling. Two queries consume the entire ceiling, so paid deep mode is rejected at the proposed subscription price. A planning budget is $0.005 search + $0.003 inference + $0.002 hosting; the latter two are allocation ceilings, not measured vendor costs.

The [API page](https://brave.com/search/api/) requires a plan explicitly granting storage rights to retain results. [Official help](https://api-dashboard.search.brave.com/documentation/resources/help-feedback) says API access does not grant rights to third-party pages. Production must review the selected plan, permitted retention and content use before storing leads in History. No account or paid request was made. If suitable rights or the cost ceiling cannot be met, public launch remains blocked; this is not permission to silently remove the requested research capability.
