# Superseded safety routing experiments

Current copy and evidence: ../safety-policy.md.

## Historical routing pilots

Executed evidence: repair-pilot-repeated.json has three local 4B trials of the sports-refusal repair with the exact allowed-synthesis prompt in scripts/repair-repeated.py. All three returned a concise Brazil pick without refusal or a fake supporting rationale. That is a routing mitigation check, not proof Brazil will win or proof of safety for arbitrary input. The general relocation repair still invents a location and is **not** counted as grounded success. The final engine must bind output to collected context and must be independently graded.

Fixed sensitive-topic copy (no model rewrite):

- Death/serious illness: “That deserves care, not a prediction. I can help you look toward a goal you can shape.” CTA: “What goal will I reach this year?” For illness, add “For health concerns, speak with a qualified clinician.”
- Self-harm: “You deserve support right now. The Ball won’t predict harm. If you may act on these feelings, contact emergency services or someone you trust now.” Offer a safe connection question without claiming a crisis assessment.
- Pregnancy: “That deserves a reliable answer, not a forecast. A test or qualified clinician can help. Let’s explore a personal goal instead.”
- Legal: “A legal outcome needs qualified guidance. Let’s look at a goal you can shape instead.”

Redirects are kind, do not echo internal fixture descriptions, do not charge a credit, do not store the sensitive question in memory/history, and always offer a safe next step. Requests to predict another person's illness or death follow the same rule. A production safety evaluation needs more languages, euphemisms and adversarial cases than this research pilot; the app phase includes a runnable boundary suite.

Follow-up evaluation correctly noted that the raw repaired sports headline alone lacked the promised visible speculative context. scripts/presentation-pilot.py now executes three 4B requests and emits the **complete rendered contract**: short headline, visible “Speculative forecast · not a guarantee” label, explicit no-current-evidence explanation, and zero sources. The resulting sports-presentation-pilot.json is the artifact to assess for that routing/presentation decision. The headline remains definitive per the brief; its context makes clear it is a guess. Raw headline-only rows are not the complete user presentation. Current disclosure placement follows the [UI rules](../../design/ui-rules.md#navigation-and-the-17-states).

The independent presentation review found no sports-presentation blockers (8/10 research pilot; broader runtime coverage belongs to the app). Brazil came from the repair prompt; Argentina came from the separate full-presentation prompt. This variation is expected for speculative picks and neither is asserted as a researched result. When user context exists, Why must additionally show those supplied facts as **user-provided, unverified**, without claiming their absence. The fixed no-current-evidence message refers specifically to verified external performance evidence.

## Executed combined-layer follow-up
Firstmate authorized phrase rules before the model, either-layer block, structured decoding with one repair, and fail-closed errors. Actual implementation: server/safety.ts and provider.ts. docs/evidence/safety-heldout.json records30 held-out wordings:20 true positives,0 false negatives,2 false positives,8 true negatives; precision90.9%, recall100%. The two false blocks concern a cancer-survivor novel and pregnancy memoir. Conservative overblocking remains a known cost; no broad safety guarantee follows from n30. Failed original model-only pilot remains in evidence/safety-boundary-pilot.json. The JSON retry guard has an executable malformed-output rejection test in tests/engine.test.ts.
