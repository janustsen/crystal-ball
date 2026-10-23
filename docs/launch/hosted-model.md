# Hosted inference decision — 2026-09-30

**2026-10-23: Cloudflare Workers AI Free first, DeepInfra paid backup, then readable refusal at the $25/month cap.** Both providers remain off until their individual semantic/safety approvals. Local development defaults to Ollama. Neither structural checks nor this implementation approve model quality. Earlier provider/cost tables below are historical research.

| Choice | Provider / model | Quality fit (hypothesis) | Latency (unmeasured) | USD / million input, output | Estimated reading |
|---|---|---|---|---|---|
| A | Together / `Qwen/Qwen3.5-9B` | Same model family; useful provider comparison, not independent quality evidence. | Compare time to complete validated output against B, including repair. | $0.17 / $0.25 | $0.00161 |
| B | DeepInfra / `Qwen/Qwen3.5-9B` | Small Qwen candidate; short constrained prose suits the task. Must beat existing semantic regressions. | Small model should be a useful low-latency candidate; queues and reasoning can dominate. | $0.10 / $0.15 | $0.00095 |
| C | Google / `gemini-3.1-flash-lite` | Broader instruction-following candidate if Qwen fails semantic grading. | Google reports improved first-token speed against 2.5 Flash; not an app benchmark. | $0.25 / $1.50 | $0.00350 |

Prices: [DeepInfra](https://deepinfra.com/pricing), [Together](https://www.together.ai/pricing), [Google model card](https://deepmind.google/models/model-cards/gemini-3-1-flash-lite/). Google's speed claims: [launch announcement](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/). Recheck availability and prices before buying; no vendor latency guarantee is inferred.

Estimates assume a full reading uses **8,000 input + 1,000 output tokens total** across planning and prediction, no caching or tools. Formula: `(8000 × input price + 1000 × output price) / 1,000,000`. These are planning assumptions, not measured token counts. Allow roughly 2–3× for repair (the repair prompt repeats context), plus separately billed reasoning, hosting, database and any search costs. Ten thousand baseline readings: A $16.10 / B $9.50 / C $35.00. Retries can make an unsuccessful reading cost money too.

The [previous local comparison](../evidence/model-comparison.md) completed only 10/20 cases for both Qwen3.5 9B and Qwen3 4B with an experimental reviewer; 9B was slower (23.90s vs 5.22s median, with contention). The reviewer was subsequently removed. These failures remain evidence: larger Qwen has not earned a quality upgrade. Use the current engine and held-out cases for the hosted replay. The cost assumption above matches the original [pricing budget](../research/pricing.md), not a new measured token count.

## Captain's cost ceiling and daily omen

The approved ceiling is **under $0.01 per free reading**. Daily omen is a separate tiny personalized call, approximately **$0.0002 per active user/day**, generated only when that user opens the app that day. This replaces the earlier “only if free” condition; it does not authorize accounts or spending.

Cost rank below uses the cited rates, the same 8,000-input/1,000-output reading assumption, and an **800-input/80-output omen**. The 3× reading scenario is a repair/reasoning stress estimate, not a guaranteed bound.

| Cost rank | Choice | Reading baseline | Reading at 3× | Remaining below $0.01 at 3× | Omen baseline | Budget assessment |
|---|---|---|---|---|---|---|
| 1 | B · DeepInfra Qwen3.5-9B | $0.00095 | $0.00285 | $0.00715 | $0.000092 | Strongest estimated headroom; omen fits |
| 2 | A · Together Qwen3.5-9B | $0.00161 | $0.00483 | $0.00517 | $0.000156 | Reading and single-call omen fit; retained first evaluation recommendation |
| 3 | C · Gemini 3.1 Flash-Lite | $0.00350 | $0.01050 | **-$0.00050** | $0.000320 | Baseline reading fits; stress case exceeds ceiling and omen exceeds target |

The earlier recommendation was A for the first evaluation; the 2026-10-20 decision selects B. Local 9B failures mean price alone cannot justify deployment. C needs a smaller measured token budget before it is a viable free-reading/omen choice.

The device allows one retry after a failed or interrupted omen, so a user can cost up to two omen requests a day, and the same request also returns the one-sentence whisper (roughly 25 more output tokens). An omen retry can break the tiny daily target: at 3×, A costs $0.000468 and B $0.000276. The device-local generation claim, cache and failure behavior are documented in [omen setup](../../SETUP.md#daily-omen-widget-and-check-ins); the hosted endpoint also enforces the [server-side daily quota](#paid-and-user-controls). A failed generation still incurs cost. Do not silently apply the reading's repair budget to an omen or claim these estimates enforce a spending limit. The output caps below do **not** enforce the omen dollar target or the per-reading dollar ceiling. Those require measured usage, server-side budget enforcement and approved provider configuration before launch. Keep the original one-repair/fail-closed reading contract.

## Implemented boundary

`server/provider.ts` uses the same one-repair validator for all transports. Public `server/hosted-limits.ts` authenticates with Supabase before inference, requires versioned two-processor consent and uses provider-independent action admission once for all classification, generation and repair calls in an app action. Social, omen and Year ahead use the same chain. Successful-reading entitlement billing remains separate and charges only completed readings.

The serving models and URLs are pinned in `server/hosted-config.ts`: Cloudflare `@cf/meta/llama-3.3-70b-instruct-fp8-fast` over account-scoped REST, then DeepInfra `Qwen/Qwen3.5-9B`. Each has its own approval flag. Cloudflare receives its direct `response_format.json_schema` schema and returns `result.response`; DeepInfra receives the nested OpenAI strict schema and returns `choices`. HTTP redirects are forbidden. Attempts time out at 45 seconds, or 90 for Year ahead, and respect caller cancellation. Caps are 1,200 output tokens ordinarily, 160 for omen/chart, 240 for insight and 900 for Year ahead. No provider switching resets the one-repair counter.

Fallback occurs only when the atomic free ledger cannot admit an attempt (including the UTC reset guard), or the free provider has not been quality-approved. HTTP 429/minute throttling, other HTTP errors, invalid credentials, database failures, safety refusal and invalid semantic output do not trigger paid model shopping. A free repair may move to approved paid inference if its free reservation cannot fit. Exhausting the paid ledger never blocks eligible free inference. If both capacities are unavailable the existing readable monthly-budget refusal reaches the client.

### Free capacity

`202610230010_cloudflare_neurons.sql` supplies service-only atomic RPCs. The dedicated account's bucket is shared by all actions/models, in integer microneurons: 10,000 neurons per UTC day, reset at 00:00 UTC. Each attempt holds a conservative 24,000-input-token bound plus capped output, at 26,668 input / 204,805 output microneurons per token ([Cloudflare model/rates](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/)). A standard hold is 885.798 neurons. Verified usage releases excess; missing/malformed usage, failed HTTP and uncertain outcomes retain the hold. Settlements are idempotent and update the original day even after rollover. Starts in the final five UTC minutes go to the paid ledger, preventing in-flight calls crossing the provider reset. Oversized prompts fail without truncation or paid fallback. Conservative holds can route to paid earlier than the approximately 23-reading/day planning estimate.

Use a **dedicated Workers Free account** for this app, without unrelated model usage. The API cannot prove account plan from a Workers AI token: `CLOUDFLARE_WORKERS_PLAN=free` records the operator's verified configuration, not a plan-changing command. No Worker deployment, paid upgrade or overage is enabled here. Workers Free's vendor hard stop is the final protection ([pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)). Never upgrade that account or enable Gateway content logging/caching. Unknown holds need invoice/usage reconciliation; do not delete them to recover capacity.

### Paid and user controls

The existing `202610200010_hosted_limits.sql` money ledger is unchanged: service-only row locks enforce reserved + actual <= 25,000,000,000 nanodollars per UTC month. Every paid HTTP attempt holds the entire 262,144-token input window and capped output at priority rates, up to $0.0395916. Verified usage settles once; failures/missing usage retain the entire hold. The last five minutes of the month refuse paid starts. Keep the serving key dedicated, auto-recharge off and vendor prepaid/spend limits as a second boundary. This cap covers inference, not all hosting/business expenses.

Existing daily action quotas are unchanged: first 20 free questions then 1/day, Plus 10/day and packs/bonuses; two reading attempts per slot, six plans per slot, four drafts per slot, omen two/day, insight three/day and chart/Year ahead two/day. One admission covers host switching and all model calls in that incoming app action. The aggregate `heard` counter has no inference or identity.

## Comparison and quality approval

Run `npx tsx scripts/hosted-bakeoff.ts --check` offline. The real comparison reads only `DEEPINFRA_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_WORKERS_PLAN` from `/Users/janustsen/.config/crystal-ball/hosted.env` into memory. A missing key records a skip; it cannot cause a paid request. The spending ledgers and lock stay in the fixed `.local` directory across reruns:

```sh
HOSTED_BAKEOFF_DIR=/tmp/cb-quality-evidence npx tsx scripts/hosted-bakeoff.ts
```

DeepInfra remains capped at **$1 across reruns**, using full-context priority reservations before HTTP, releasing only verified usage. Existing `.local/hosted-budget.json` paid reservations are reused across reruns. Cloudflare has a 10,000-neuron UTC-day local hold ledger and must use a dedicated Free test account without concurrent serving/other usage. Never delete budget files to rerun. HTTP errors halt that candidate. The script compares today's local Qwen and both hosted providers on four fixed-context regressions, four whole flows, sensitive redirects, teen/unknown-age inputs, omen/whisper, long Year ahead context and social moderation. It retains raw provider responses and failed engine results, timing, token/neuron usage and costs; synthetic cases only. Social publication/rewrite still needs its whole-flow comparison before approval.

**Required first-card gate: p95 <= 10 seconds for each hosted provider.** Each whole-reading case records `firstCardSeconds` from the planning request (before `makePlan`) through its first validated, adapted question card, including safety, transport, decoding, validation and any repair. Timing ends before answers and prediction. Fixed-context forecasts, ancillary surfaces and expected sensitive redirects do not request a first card and are excluded. The six ordinary/teen/unknown-age planning cases must all produce a card; failed plans or an interrupted run fail the gate. `firstCardGates` reports each provider's expected/successful/failed sample counts and nearest-rank `p50Seconds` / `p95Seconds`, with `passed` true only for a complete sample set whose p95 is at most 10 seconds. A measured hosted failure gives the comparison a nonzero exit status; a missing key leaves that provider skipped with an unpassed gate and null percentiles. This small bake-off sample measures engine planning, not public HTTP/auth overhead or device rendering; deployed smoke must verify the hosted request boundary too.

Review outputs blind to provider for forecast/card semantics, invented facts, sensitive/teen handling, first-pass validity, repair rate and whole-flow p50/p95. First-card latency passing is required **in addition to** semantic/safety approval. Approval is per pinned model: set `CLOUDFLARE_QUALITY_APPROVED=true` only after Cloudflare's comparison and first-card gate pass, and `DEEPINFRA_QUALITY_APPROVED=true` only after DeepInfra's pass. Defaults are false. Valid JSON or fast cards do not prove semantic quality or predictive accuracy. Missing credentials leave quality, latency and deployed smoke unverified.

## Deployment handoff and exact secrets

The launch-infra lane owns hosted project/deployment integration. Rebase with its branch before delivery if it advances; never select another project's credentials. Public deployment and policy publication require the approved Supabase target.

| Name | Destination | Meaning |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Supabase Edge Function secrets; external comparison key file | Dedicated Workers Free account ID (configuration, not itself secret) |
| `CLOUDFLARE_API_TOKEN` | Same private destinations | Account-scoped Workers AI token from the Workers AI template; never a global API key |
| `DEEPINFRA_API_KEY` | Same private destinations | Dedicated Qwen serving/comparison key; never Expo |
| `CLOUDFLARE_WORKERS_PLAN` | Same destinations | `free`, after dashboard plan verification; never enable billable overage |
| `CLOUDFLARE_QUALITY_APPROVED`, `DEEPINFRA_QUALITY_APPROVED` | Supabase Edge Function secrets | Independently reviewed approvals; default `false` |
| `MODEL_PROVIDER`, `HOSTED_MODEL_DISCLOSURE`, `APP_ORIGIN` | Supabase Edge Function secrets | `hosted`, `cloudflare-deepinfra-v1`, approved app origin |

Use a private copy of `supabase/hosted.env.example` with `supabase secrets set --env-file <private-file> --project-ref <approved-ref>`. Supabase supplies its URL/service-role credentials. Apply migrations and deploy `predict` on that verified target. App builds use `docs/launch/hosted-app.env.example`: `EXPO_PUBLIC_AI_PROVIDER_NAME=Cloudflare and DeepInfra` produces the versioned consent ID. Never expose provider/service-role keys through `EXPO_PUBLIC_*`. Publish the [two-processor privacy policy and Llama attribution](app-store.md#cloudflare-and-deepinfra-processing-disclosure), rebuild and obtain fresh consent; DeepInfra-only approval does not carry over.

Run check/test, `scripts/verify-hosted-limits.py` on disposable PostgreSQL and the project hosted-consent/limit browser drives. Then smoke the actual deployed endpoint: missing/expired auth and stale/missing consent refuse before any provider request; valid anonymous session returns a real reading; free exhaustion routes to capped paid inference, paid exhaustion still allows eligible free inference, both exhausted show a readable refusal. Compare actual ledgers with vendor usage. Local PostgreSQL/fetch/browser fault injection does not establish hosted compatibility, model quality, policy publication or TestFlight readiness.

## Codex subscription testing (not a launch provider)

For local development only, `MODEL_PROVIDER=codex CODEX_MODEL=gpt-6-luna npm run server` uses the captain’s existing ChatGPT-authenticated Codex CLI. `gpt-6-luna` is the requested working default; `CODEX_MODEL` can be changed locally. This is subscription usage, subject to plan limits, not an API cost benchmark or a public-serving arrangement. No API key is required or inherited. Questions do leave the machine for ChatGPT processing; use synthetic test readings. The hosted HTTP adapters remain the launch path, and committed `MODEL_PROVIDER=ollama` stays unchanged.

`server/codex-provider.ts` is imported only by the loopback Node entry point. The shared/deployed provider factory rejects `codex`; the Node adapter rejects `NODE_ENV=production`. Each inference uses `codex exec --ephemeral --skip-git-repo-check -s read-only -m <CODEX_MODEL>` with a JSON schema, stdin prompt and temporary result file. It forces ChatGPT login, strips API-key environment variables, ignores user configuration/project instructions, disables hooks/shell/multi-agent/skill search and web search, and deletes its private temporary directory. The common validator retains one constrained repair then fails closed. Each CLI attempt times out after 45 seconds; client and planning deadlines follow the [request contract above](#implemented-boundary).

The installed CLI flags were checked against `codex exec --help` and [OpenAI non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode); auth restriction follows [OpenAI configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference). This path must not be bundled into an app, enabled in Supabase, or exposed as a user-facing service.

See [measured development latency and retained outputs](verification.md#local-codex-follow-up) for the historical Codex sample; it establishes neither production latency nor model quality. Golden forecasts are now implemented; their current contract is in [README](../../README.md) and their verification requirements are in the [delight feature map](../../.agents/skills/verify-crystal-ball/features/delight.md). The historical sample does not establish golden-path coverage. Daily omen is also implemented; see [omen setup and limits](../../SETUP.md#daily-omen-widget-and-check-ins). The historical sample does not establish omen-path coverage.
