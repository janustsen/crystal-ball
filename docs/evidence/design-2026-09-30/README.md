# Replacement design verification

The 17-screen Crystal Ball.html export replaces A4. The app now uses its glass/brass orb, warm smoke, fonts, icons and screen compositions with real engine data. Home and Ask use the same artwork. The old A4 prototype was preserved under ignored `.local/concepts-a4-retired.html` and removed from the public preview.

The live preview is http://janus-mac.tail8d2280.ts.net:8087. The Expo development bridge lets the MacBook use the iMac's loopback engine. There is no public production deployment.

## Visual evidence

| Flow | Captures |
|---|---|
| Entry | [Home](01-home.png), [approach](02-approach.png), [voice/fallback](03-listening-fallback.png), [typing](04-typing.png) |
| Questions | [first](05-question-one.png), [second](06-question-two.png), [third](07-question-three.png), [thinking](08-thinking.png) |
| Result | [reveal and Why](09-reveal-why.png), [share](10-share.png), [story preview](11-story-card.png), [actual PNG](story-1080x1920.png) |
| Recovery | [error](12-error.png), [sensitive redirect](13-sensitive.png), [long wait](long-wait.png), [timeout](timeout.png), [retained answers](review-retained-answers.png) |
| Other destinations | [plans](14-plans.png), [Explore](15-explore.png), [History](16-history.png), [You](17-you.png) |
| Accessibility | [375×667 with 200% text and reduced motion](small-large-text-reduced-motion.png), [large-text own answer](large-text-own-answer.png) |

## Executable proof

`npm run check` and `npm test` pass: 30 passing tests, one optional ffmpeg test skipped. The three current browser drivers are documented in the project verify-crystal-ball skill. [drive.json](drive.json) records real Ollama plan/prediction responses, zero page errors and zero axe violations for the sampled screens. [memory-and-boundaries.json](memory-and-boundaries.json) records remembered-fact skipping, forgotten-fact re-asking, real friend-memory isolation, a real model-authored general flow and reset preserving credits. [recovery.json](recovery.json) records request cancellation, the actual 60-second timeout, microphone cleanup and retained answers on prediction failure.

The first run found missing `aria-checked` on the plan choices. It was fixed and re-driven; the [failed transcript](drive-round1-failed.json) and [failure image](round1-plan-aria-failure.png) remain evidence. Forecast correctness is not established by these structural/behavioral checks.

## Blast radius

The shared request URL now defaults to a same-origin development bridge for web; native still defaults to loopback. Both prediction and animated export use that URL. `scripts/check-preview-bridge.mjs` runs against the real Metro middleware and engine: health identifies Ollama, a real sensitive question stays blocked, a mismatched localhost origin returns 403, GET on the prediction endpoint returns 405, and an oversized body returns 413. This proves the bridge preserves those engine boundaries instead of bypassing the handler. Expo itself rejects arbitrary foreign origins before the custom middleware.

The persistent account and prediction formats are unchanged. The new approach/listening states are transient UI state. Real reload, history outcome, memory, friend isolation and credit assertions exercise the callers that a theme/flow change could otherwise break. Decoder repair/fail-closed behavior remains covered by the existing tests.

`npx expo export --platform ios --output-dir .local/ios-export` also passed: the native bundle includes the matching TTF fonts and the native-safe orb render. This is a bundle check, not simulator/device verification.

## Limits

Remote HTTP cannot record browser speech; typing works, and real browser voice needs localhost/HTTPS plus microphone permission. Speech-constructor cleanup and the OS share-sheet boundary are explicitly mocked in their respective checks. PNG was inspected at 1080×1920; it contains headline, speculative label and branding, without question, facts or Why. The current iMac lacks ffmpeg, so video export reports a recoverable failure rather than producing MP4. Supabase mirroring is optional and unavailable here. The native orb uses a static PNG rendered from the same SVG because React Native SVG does not implement turbulence/displacement. Native/device behavior, configured Apple sign-in, real billing and predictive accuracy are not claimed verified.
