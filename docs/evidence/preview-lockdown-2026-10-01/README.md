# Preview lockdown regression evidence

Greptile's post-merge review of https://github.com/janustsen/crystal-ball/pull/2 identified the preview client boundary, duplicate final submission, and paused animation work. Friend-reading privacy is owned by the separate social follow-up.

Before the fix, a POST without Origin or credentials reached the live engine and returned HTTP 200 (a safety redirect, avoiding unnecessary inference). A headed Chrome probe counted 36 requestAnimationFrame callbacks in 600 ms with OS reduced motion enabled. Two DOM clicks on the final option, in one JavaScript task, dispatched two prediction requests before React rerendered. The prediction route was deliberately aborted after counting requests; planning used real local Qwen. These browser integration reproductions were captured before implementation rather than committed as a standalone red-test revision.

After the fix, `scripts/check-preview-lockdown.mjs` verifies the real running preview:

- Unauthenticated and origin-less engine/export requests return 401. The health endpoint requires the credential and Origin too.
- The Expo HTML shell contains no key; downloading the JavaScript bundle requires HTTP Basic authentication. Correctly authenticated clients still use the real Ollama engine.
- OS reduced motion, app reduced motion, and an injected hidden-page boundary each produce zero callbacks over 600 ms after settling. Resuming each produces 36–37 callbacks. The visibility event is injected for determinism; physical device visibility is not claimed.
- The same double click produces one prediction request. A subsequent retry after an injected network failure is accepted.

`tests/preview.test.ts` exercises the actual middleware over real HTTP, including absent configuration, credential/origin failures, authenticated bundle access, method rejection, and cross-origin rejection. `npm run check` passed; `npm test` passed 34 tests with the optional ffmpeg test skipped.

All three authenticated design/memory/recovery browser drives passed, including real prediction, story PNG, privacy of the exported card, history, memory, simulated plans, cancellation, timeout, retained answers, and accessibility. Headed reduced-motion/large-text checks passed. The serial Chrome trace passed all callback and fog-draw thresholds: Share 59.5 fps / 33.4 ms maximum; ambient 60.0 fps / 18.7 ms maximum. Local traces/screenshots remain under ignored `.local/lockdown-verify/`; credentials are not published.

The critical transport invariant is proven on the browser surface: authenticated plan/predict and sharing still work after the shared request header change, while requests without credentials cannot reach the engine. Direct loopback development tooling remains local. Native speech/FPS, actual purchases and ffmpeg video success were not validated here. Prior intermittent host GPU stalls remain documented in the original motion evidence; this pass does not erase them.
