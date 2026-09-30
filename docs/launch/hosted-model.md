# Hosted inference decision — 2026-09-30

Recommendation for the captain: **A — evaluate Together / Qwen3.5-9B first**, keeping the current local model as the baseline. This retains the [existing research recommendation](../research/decisions.md). DeepInfra is the cheaper comparison candidate. This is a proposed evaluation choice, not an enabled provider or a quality pass. The original comparison used no accounts, keys or paid calls. The captain subsequently authorized a capped evaluation of A and B; see the pending benchmark below.

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

Recommendation remains **A for the first measured evaluation**, with **B the cost leader** to compare alongside it. Both have room under the reading ceiling; local 9B failures mean price alone cannot justify deployment. C needs a smaller measured token budget before it is a viable free-reading/omen choice. The captain still selects the provider.

An omen retry can break the tiny daily target: at 3×, A costs $0.000468 and B $0.000276. The retention implementation therefore needs an explicit per-user/day generation lock, cached result, token budget and failure behavior; opening twice must not trigger two calls. A failed generation still incurs cost. Do not silently apply the reading's repair budget to an omen or claim these estimates enforce a spending limit. The current adapter caps each output at 1,200 tokens; it does **not** enforce the smaller omen budget or the per-reading dollar ceiling. Those require measured usage, server-side budget enforcement and approved provider configuration before launch. Keep the original one-repair/fail-closed reading contract.

## Implemented boundary

`server/provider.ts` retains `ModelProvider.json(system, input, schema, validator)`. Default `MODEL_PROVIDER=ollama` keeps the current endpoint/model and decoder. `hosted` uses a server-only HTTPS Chat Completions base URL, model name and bearer key. No vendor SDK or automatic vendor fallback. `HOSTED_MODEL_FORMAT=json_schema` requests strict schema; `json_object` supports vendors with JSON-only decoding. Both run the existing semantic validator, permit one repair, then fail closed. HTTP errors do not retry or expose response bodies/keys. Requests refuse redirects and cap output at 1,200 tokens with a 45-second timeout per attempt. The UI's 60-second request timeout can expire before both attempts finish; measure and tune before deployment.

Candidate base URLs: DeepInfra `https://api.deepinfra.com/v1/openai`, Together `https://api.together.xyz/v1`, Google `https://generativelanguage.googleapis.com/v1beta/openai`. Verify the selected model's schema subset and thinking defaults before rollout; JSON schema support is not a semantic guarantee. [Together structured output](https://docs.together.ai/docs/inference/chat/structured-outputs), [Google compatibility](https://ai.google.dev/gemini-api/docs/openai).

`.env.example` deliberately leaves hosted settings blank. Set `HOSTED_MODEL_DISCLOSURE` and app `EXPO_PUBLIC_AI_PROVIDER_NAME` to the same clear vendor name. The app asks permission before sending; the server rejects missing/mismatched consent. Changing providers requires a rebuilt disclosure and new consent. Never put provider keys in `EXPO_PUBLIC_*`.

## After the provider decision

1. Approve account/spend and vendor retention, training use, region and subprocessors. Set a small hard spending limit and alerting.
2. Run held-out safety/semantic cases and real whole-flow timing for each candidate. Record first-pass validity, repair rate, semantic grading, p50/p95 latency, tokens and actual cost. Preserve failures. Do not substitute structural success for predictive accuracy.
3. Deploy an authenticated, rate-limited engine with server-side quotas and abuse controls. The loopback Node tool is **not** a public API, and local credits are not billing enforcement. Add cancellation/budget handling before serving public traffic.
4. Publish the selected vendor and retention in the privacy policy; finish the App Store checklist. Keep Ollama default until explicitly approved.

## Paid comparison — parked by captain

The captain initially chose DeepInfra and Together, both `Qwen/Qwen3.5-9B`, with **at most $1/provider** (about $2 total). `scripts/hosted-bakeoff.ts` reads only the designated external `~/.config/crystal-ball/hosted.env` key entries at run time; keys never enter source, reports or command arguments. The file was present but both entries were empty at preparation time. The captain then parked this test in favor of development-only Codex CLI inference. No paid calls ran. The runner now refuses a live run until renewed authorization; its offline check still works.

The prepared comparison runs local Qwen as baseline, four fixed-context semantic regressions (holiday, technology job, old-friend reconnection, moving on), four whole reading flows, and three sensitive-topic redirects. It preserves each run’s raw engine results, latency and provider usage counts in a timestamped evidence file. Usage-derived dollars are not billing invoices, and completed JSON is not a semantic pass; review every forecast/card before naming a winner.

Offline check: `npx tsx scripts/hosted-bakeoff.ts --check`. After renewed authorization and removal of the explicit parked guard, live command: `npx tsx scripts/hosted-bakeoff.ts`. It reserves a conservative byte-based input budget plus template allowance and the 1,200-token output cap before each request, persists reservations across reruns, refuses concurrent runs, caps each provider at 80 requests and stops before the $1 reservation limit. HTTP/transport failures stop that provider’s remaining calls. Do not delete its `.local/hosted-budget.json` ledger to rerun. The committed default remains Ollama.

## Codex subscription testing (not a launch provider)

For local development only, `MODEL_PROVIDER=codex CODEX_MODEL=gpt-6-luna npm run server` uses the captain’s existing ChatGPT-authenticated Codex CLI. `gpt-6-luna` is the requested working default; `CODEX_MODEL` can be changed locally. This is subscription usage, subject to plan limits, not an API cost benchmark or a public-serving arrangement. No API key is required or inherited. Questions do leave the machine for ChatGPT processing; use synthetic test readings. The hosted HTTP adapters remain the launch path, and committed `MODEL_PROVIDER=ollama` stays unchanged.

`server/codex-provider.ts` is imported only by the loopback Node entry point. The shared/deployed provider factory rejects `codex`; the Node adapter rejects `NODE_ENV=production`. Each inference uses `codex exec --ephemeral --skip-git-repo-check -s read-only -m <CODEX_MODEL>` with a JSON schema, stdin prompt and temporary result file. It forces ChatGPT login, strips API-key environment variables, ignores user configuration/project instructions, disables hooks/shell/multi-agent/skill search and web search, and deletes its private temporary directory. The common validator retains one constrained repair then fails closed. Each CLI attempt times out after 45 seconds; app requests retain the 60-second timeout.

The installed CLI flags were checked against `codex exec --help` and [OpenAI non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode); auth restriction follows [OpenAI configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference). This path must not be bundled into an app, enabled in Supabase, or exposed as a user-facing service.

Measured development latency (three sequential synthetic real readings): 13.78s money, 15.76s Spanish, 25.95s novel; median 15.76s including planning and prediction. The primary browser flow also passed (planning 2.57s, prediction 11.81s). See [verification and retained outputs](verification.md#local-codex-follow-up). Omen/golden integration is pending owning-lane code; no production latency or model-quality conclusion follows from this small sample.
