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

Greptile follow-up on https://github.com/janustsen/crystal-ball/pull/8 reproduced a reduced-motion mood regression: listening retained calm values `[1,1,.5,1]` because its one redraw had zero elapsed time. Reduced mode now applies the target immediately. The live regression observes listening `[2.2,1.15,.6,1]` and question `[1.1,.9,.5,1]` uniforms while retaining zero idle callbacks. This is a browser integration repro, not a standalone red-test commit.

The motion driver's authentication URL now travels through stdin instead of process arguments. A subprocess regression executes the emitted driver script and checks its destination, verifies the actual argv contains no credential, and confirms child-process failures cannot echo the key. Type checking and 35 tests pass (one optional ffmpeg skip). Secret rotation instructions now clear Metro's cached embedded key; an isolated pipeline preview previously required that cache rebuild before its authenticated client could work.

The subsequent 0ab33be6 functional, memory, recovery, bridge, lockdown and accessibility drives passed. Its motion trace retained another intermittent Share stall (52.3 fps, 300.1 ms maximum) under `.local/lockdown-final-0ab33be6/`; other samples were around 60 fps. This failure is preserved alongside the earlier passing measurement.
