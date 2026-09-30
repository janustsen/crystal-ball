# Hosted inference decision — 2026-09-30

Recommendation for the captain: **A — evaluate Together / Qwen3.5-9B first**, keeping the current local model as the baseline. This retains the [existing research recommendation](../research/decisions.md). DeepInfra is the cheaper comparison candidate. This is a proposed evaluation choice, not an enabled provider or a quality pass. No accounts, keys or paid calls were made.

| Choice | Provider / model | Quality fit (hypothesis) | Latency (unmeasured) | USD / million input, output | Estimated reading |
|---|---|---|---|---|---|
| A | Together / `Qwen/Qwen3.5-9B` | Same model family; useful provider comparison, not independent quality evidence. | Compare time to complete validated output against B, including repair. | $0.17 / $0.25 | $0.00161 |
| B | DeepInfra / `Qwen/Qwen3.5-9B` | Small Qwen candidate; short constrained prose suits the task. Must beat existing semantic regressions. | Small model should be a useful low-latency candidate; queues and reasoning can dominate. | $0.10 / $0.15 | $0.00095 |
| C | Google / `gemini-3.1-flash-lite` | Broader instruction-following candidate if Qwen fails semantic grading. | Google reports improved first-token speed against 2.5 Flash; not an app benchmark. | $0.25 / $1.50 | $0.00350 |

Prices: [DeepInfra](https://deepinfra.com/pricing), [Together](https://www.together.ai/pricing), [Google model card](https://deepmind.google/models/model-cards/gemini-3-1-flash-lite/). Google's speed claims: [launch announcement](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/). Recheck availability and prices before buying; no vendor latency guarantee is inferred.

Estimates assume a full reading uses **8,000 input + 1,000 output tokens total** across planning and prediction, no caching or tools. Formula: `(8000 × input price + 1000 × output price) / 1,000,000`. These are planning assumptions, not measured token counts. Allow roughly 2–3× for repair (the repair prompt repeats context), plus separately billed reasoning, hosting, database and any search costs. Ten thousand baseline readings: A $16.10 / B $9.50 / C $35.00. Retries can make an unsuccessful reading cost money too.

The [previous local comparison](../evidence/model-comparison.md) completed only 10/20 cases for both Qwen3.5 9B and Qwen3 4B with an experimental reviewer; 9B was slower (23.90s vs 5.22s median, with contention). The reviewer was subsequently removed. These failures remain evidence: larger Qwen has not earned a quality upgrade. Use the current engine and held-out cases for the hosted replay. The cost assumption above matches the original [pricing budget](../research/pricing.md), not a new measured token count.

## Implemented boundary

`server/provider.ts` retains `ModelProvider.json(system, input, schema, validator)`. Default `MODEL_PROVIDER=ollama` keeps the current endpoint/model and decoder. `hosted` uses a server-only HTTPS Chat Completions base URL, model name and bearer key. No vendor SDK or automatic vendor fallback. `HOSTED_MODEL_FORMAT=json_schema` requests strict schema; `json_object` supports vendors with JSON-only decoding. Both run the existing semantic validator, permit one repair, then fail closed. HTTP errors do not retry or expose response bodies/keys. Requests refuse redirects and cap output at 1,200 tokens with a 45-second timeout per attempt. The UI's 60-second request timeout can expire before both attempts finish; measure and tune before deployment.

Candidate base URLs: DeepInfra `https://api.deepinfra.com/v1/openai`, Together `https://api.together.xyz/v1`, Google `https://generativelanguage.googleapis.com/v1beta/openai`. Verify the selected model's schema subset and thinking defaults before rollout; JSON schema support is not a semantic guarantee. [Together structured output](https://docs.together.ai/docs/inference/chat/structured-outputs), [Google compatibility](https://ai.google.dev/gemini-api/docs/openai).

`.env.example` deliberately leaves hosted settings blank. Set `HOSTED_MODEL_DISCLOSURE` and app `EXPO_PUBLIC_AI_PROVIDER_NAME` to the same clear vendor name. The app asks permission before sending; the server rejects missing/mismatched consent. Changing providers requires a rebuilt disclosure and new consent. Never put provider keys in `EXPO_PUBLIC_*`.

## After the provider decision

1. Approve account/spend and vendor retention, training use, region and subprocessors. Set a small hard spending limit and alerting.
2. Run held-out safety/semantic cases and real whole-flow timing for each candidate. Record first-pass validity, repair rate, semantic grading, p50/p95 latency, tokens and actual cost. Preserve failures. Do not substitute structural success for predictive accuracy.
3. Deploy an authenticated, rate-limited engine with server-side quotas and abuse controls. The loopback Node tool is **not** a public API, and local credits are not billing enforcement. Add cancellation/budget handling before serving public traffic.
4. Publish the selected vendor and retention in the privacy policy; finish the App Store checklist. Keep Ollama default until explicitly approved.
