# Motion verification · 2026-09-30

The isolated Chrome run used 390×844 at device scale 1, no CPU/network throttling, real local Ollama readings, and `chrome-devtools-axi perf-start/perf-stop`. The final sequential drive passed. `samples.json` records both display frames and actual WebGL draws; callback cadence alone would have hidden the old 30fps cap.

| Interaction | Display fps | Fog fps | p95 frame ms | Maximum ms |
|---|---:|---:|---:|---:|
| idle-both-orbs | 60.1 | 60.1 | 16.8 | 16.8 |
| orb-approach-listening | 60.2 | 60.2 | 16.8 | 16.8 |
| listening | 60.0 | 60.0 | 16.8 | 16.8 |
| typing | 60.0 | 60.0 | 16.7 | 16.8 |
| planning-to-question-one | 60.2 | 60.2 | 16.8 | 16.8 |
| question-two | 60.2 | 60.2 | 16.8 | 16.8 |
| question-three | 60.2 | 60.2 | 16.7 | 16.8 |
| thinking-to-reveal | 60.1 | 60.1 | 16.7 | 16.8 |
| share | 59.7 | 59.7 | 16.8 | 33.3 |
| return-reveal | 60.2 | 60.2 | 16.7 | 16.8 |
| return-home | 60.1 | 60.1 | 16.7 | 16.8 |
| explore-tab | 60.1 | 60.1 | 16.7 | 16.8 |
| history-tab | 60.0 | 60.0 | 16.8 | 16.8 |
| you-tab | 60.1 | 60.1 | 16.8 | 16.8 |
| ask-tab | 60.2 | 60.2 | 16.8 | 16.8 |
| close-flow | 60.2 | 60.2 | 16.7 | 16.8 |
| ambient-sky | 60.0 | 60.0 | 16.7 | 16.8 |

Every sample had zero long main-thread tasks. Share had one 33.3ms frame; this is approximately 60fps evidence, not a promise of zero dropped frames on every device. The 45-second ambient sample includes the continuous sky and fog timelines. `timing-trace.json.gz` is a Chrome-readable timing excerpt with interaction marks; network and profiler payloads are omitted. `trace-provenance.json` records the full local trace path and SHA-256. The raw trace remains in ignored `.local/`.

## Failures retained

The original renderer measured 90 fog draws in three seconds (30fps). Its first interaction trace showed a 300ms typing gap while the WebGL program was rebuilt for mood changes. The first corrected flow still had a 298.5ms Share gap (`first-pass-share-hitch.json`): export preview rasterized the complex SVG at opening. It now loads the existing baked PNG through Expo Asset. A later run overlapped the 17-screen browser driver and captured GPU contention; `concurrent-load-samples.json` preserves it. The passing run was serial and captured screenshots outside timed samples. No failing record was deleted.

## Accessibility, native, and visual scope

`reduced-motion.json` proves OS and app preferences stop all canvas draws and running CSS animations, then resume rendering when requested. Large text retains both orbs and visible tabs; reduced motion skips the approach delay. The 17-screen functional drive passed again with the new art, including the actual 1080×1920 PNG export. Updated functional screenshots remain in `../design-2026-09-30/`.

Inspected `fog-home.png`: both spheres contain fog beneath glass reflections; wisps escape above their edges, with warm halos. The old rotating noise plate is gone. Native animation uses seamless texture layers and the native driver; the iOS bundle succeeds, but this iMac has no `simctl`, so native device frame rate is **not verified**. Remote HTTP voice still needs HTTPS for a real microphone; ffmpeg is absent for video export. Those existing boundaries remain explicit.

Final checks: `npm run check` passes; `npm test` reports 30 passes and one explicit optional-ffmpeg skip. The three real browser drives (17-screen, memory/boundaries, recovery) pass, and the remote bridge safety check passes. The final iOS JavaScript bundle exports successfully. Shared-component blast-radius check: the same Screen/Orb primitives were driven through every screen, large text/reduced motion, Share and the bottom Ask action; the actual PNG export remains 1080×1920 without private answers.
