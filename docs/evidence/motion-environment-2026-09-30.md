# Motion failure diagnosis — 2026-09-30

Status: **blocked, no product fix established**. The motion gate still fails.
No thresholds were relaxed and no app code was changed. Broad tests, lint,
static analysis, pipeline control, and delivery phases were not run.

## Reproduction

From this worktree, started `npx expo start --web --no-dev --minify --host localhost --port 8088`.
Used the already available loopback engine for real readings. Ran:

```sh
PREVIEW_URL=http://localhost:8088 MOTION_EVIDENCE="$PWD/.local/baseline" \
CHROME_DEVTOOLS_AXI_HEADED=1 \
CHROME_DEVTOOLS_AXI_USER_DATA_DIR="$PWD/.local/motion-profile" \
node scripts/drive-motion.mjs
```

The exact gate failed on thinking-to-reveal (182.4 ms, 57.9 fps) and Share
(200.6 ms, 50.1 fps). Other transitions and the 45-second ambient sample passed.
The Chrome trace showed GPU-thread tasks lasting 203.1, 219.6, and 241.5 ms;
there were no main-thread tasks longer than 45 ms within these two samples.

## Controlled probes

Temporary Playwright drivers exercised the same real reading flow in headed
Chrome 154 on Apple M1 Metal, with a fresh browser context per run. Each probe
changed one variable. The table gives each run's worst sampled frame.

| Probe | Transition | Maximum frame (ms) | Sample fps |
| --- | --- | ---: | ---: |
| gpu | question-two | 177.0 | 55.4 |
| no-graphite | share | 134.3 | 28.9 |
| no-blur | typing | 153.6 | 55.5 |
| stacks | share-repeat | 66.2 | 57.0 |
| no-fog | reveal | 106.6 | 55.7 |

- `gpu`: unchanged app with expanded GPU tracing.
- `no-graphite`: unchanged app, Chrome's `--disable-skia-graphite` flag; performance worsened throughout.
- `no-blur`: CSS disabled only `.orb .optics [filter]`; stalls persisted.
- `stacks`: unchanged app with GPU process sampling and expanded tracing. Profiling can affect timing; this was diagnostic only.
- `no-fog`: replaced WebGL `drawArrays` with a no-op before loading the app; stalls persisted. Draw counters in this probe count calls, not actual rendered fog.

All diagnostic overrides were temporary and removed.

## Independent environment control

A fresh headed Chrome page containing only the HTML below, with no app,
WebGL, requests, or model invocation, ran for 3,600 animation frames.
Thirty consecutive 120-frame windows used requestAnimationFrame timestamps
and the same fps, p95, and maximum-frame calculations as the app audit.

```html
<style>
body { background: #120e0b }
i { display:block; width:240px; height:240px; border-radius:50%;
    background:radial-gradient(#f2c284,#281b10);
    animation:glow 7s ease infinite alternate }
@keyframes glow { to { transform:scale(1.06); opacity:.6 } }
</style><i></i>
```

Window 14 failed: **124.7 ms maximum, 54.1 fps, 20.4 ms p95**.

This establishes that this environment can violate the motion budget independently
of Crystal Ball. It does not prove all app stalls have the same cause or that
the app passes on an uncontended host. The precise host/browser cause remains
unresolved. Changing app visuals or relaxing the acceptance gate is not justified
by these measurements. Re-run the unchanged motion gate on an isolated graphics
host before assigning the remaining failures to app code.

Only the owned preview and test browsers were stopped. Other host processes and
system configuration were left alone under the workspace boundary. Large traces,
profiles, and temporary probe drivers were removed after recording these results.

## Focused ambient retest — round 4

Status remains **blocked; no product fix established**. Reproduced the reported
45-second ambient failure using the existing motion driver and browser measurement
code, narrowing only its scenario list to `ambient-sky`. Ran headed Chrome at
390×844 against the isolated production-mode preview on localhost:8088. No engine
or model was needed for this idle scenario. Thresholds were unchanged.

| Sample | FPS | p95 ms | Maximum ms | Long tasks |
| --- | ---: | ---: | ---: | ---: |
| baseline: ambient-sky | 59.86 | 18.5 | 82.3 | 0 |
| untraced: ambient-sky | 59.91 | 18.2 | 67.9 | 0 |
| control: control-0 | 58.73 | 18.3 | 502.9 | 1 |
| control: control-1 | 58.00 | 18.5 | 238.3 | 2 |
| control: control-2 | 36.82 | 83.5 | 266.7 | 21 |

Removing trace recording did not remove the failure. A separate fresh browser
then ran three consecutive 45-second samples on a data-URL page containing only
the CSS circle animation shown above. The control used the same frame sampler,
without the inapplicable WebGL draw-rate assertion. All three control windows
failed. These failures independently reproduce environmental instability; they
do not identify its precise cause or prove that every app stall is environmental.
The baseline trace contained no duration event over 50 ms within the sample.

No app code, assertions, or thresholds were changed. The original failure has
not been fixed. An uncontended graphics host is still required to distinguish
remaining app costs from host/browser stalls. Other Chrome processes were active;
none were stopped or reconfigured. No full suite, lint, or static analysis ran.

Measurements, sanitized timing trace, and reproducible diagnostic drivers are in
`/Users/janustsen/.no-mistakes/evidence/01M3T3WRQVG8QAG5G4BSJEH2S8/round4/`.
The drivers run from this worktree with `node <evidence>/driver.mjs`,
`CHROME_DEVTOOLS_AXI_HEADED=1`, `PREVIEW_URL=http://localhost:8088` for app
samples, and `MOTION_EVIDENCE=<new-output-directory>` to preserve earlier results.
They read the committed `scripts/measure-motion-browser.js`.

Owned preview and browser sessions were stopped. Temporary drivers, raw trace,
and Expo-generated workspace artifacts were removed; dependencies were retained.
