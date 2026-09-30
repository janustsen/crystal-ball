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
