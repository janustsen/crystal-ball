# Rebased motion audit: not green

The full social and core browser journeys passed after rebase onto redesign `5c9e5d9`, as did typecheck, 36 tests, PostgreSQL RLS/concurrency and iOS export. The authenticated same-origin bridge also passed its live HTTP boundary checks.

A serial run of `PREVIEW_URL=http://localhost:8095 MOTION_EVIDENCE=docs/evidence/social-motion node scripts/drive-motion.mjs` exceeded the inherited strict frame budget. No other browser drive or bundle build owned by this worker ran concurrently.

Final recorded samples:

| Sample | FPS | Longest frame |
|---|---:|---:|
| Sky tab | 59.8 | 25.4 ms |
| Approach/listening | 58.8 | 66.6 ms |
| Thinking/reveal | 58.7 | 333.3 ms |
| Share | 39.8 | 349.9 ms |

At 2026-10-01 06:11 UTC the host reported `load averages: 75.43 94.96 60.35` with `hw.ncpu=8`. Earlier cold web bundling took 88.2 seconds. Heavy host contention is a plausible explanation; this is not proof that the feature has no performance regression. The committed redesign baseline previously met its budget. No fog/animation implementation was changed by this feature, and no shared processes were stopped.

A quiet validation window is needed to distinguish scheduling noise from a real regression before claiming the full verification skill green. Preserve the complete failed measurements and trace in `social-motion/`. Do not waive the gate or describe the timing run as passed.

The audit exited 1 with `Frame budget failed: orb-approach-listening, thinking-to-reveal, share`. The 45-second ambient sample passed at 60.0 fps / 16.8 ms maximum. Full timing excerpt and trace provenance were saved; the owned audit browser closed.
