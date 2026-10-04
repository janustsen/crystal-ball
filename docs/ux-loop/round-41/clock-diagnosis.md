# Answer-test clock discontinuity

The original answer-feedback capture at200% with normal motion failed contrast: bright fog obscured the text. An unchanged-source recheck passed, so this was investigated instead of waived.

Instrumenting actual WebGL mood uniforms and performance.now shows the cause. The test installed the fake clock after navigation and live requestAnimationFrame callbacks. In clock-diagnosis-long/fog-trace.json, performance.now moves from6787.2 to2ms. The next fake frame drives the interpolation backwards; the fog mood opacity jumps from0.25000000069 to0.7197135 (its intended range here is0.25–0.30). A separate3-second run reached1.0138894. Initial failure images are retained in answer-feedback.

[Playwright1.63 clock documentation](https://github.com/microsoft/playwright/blob/v1.63.0/docs/src/clock.md) explicitly requires install before other clock-related calls; mixing native timers and newly installed fake timers is undefined behavior. This is a test lifecycle error, not evidence that a native monotonic animation clock regressed.

Fix: install before page.goto. No production animation change. With the same6-second instrumented drive, clock-diagnosis-fixed records zero backward ticks and fog opacity0.25000000005–0.30. The four normal/reduced-motion × normal/200% answer-feedback checks pass in answer-feedback-fixed, including selected-state contrast, changing answers, explicit continuation, focus, back/cancel and duplicate-submit prevention. Diagnostic scripts are retained to reproduce the comparison; they instrument only synthetic fixture metadata.
