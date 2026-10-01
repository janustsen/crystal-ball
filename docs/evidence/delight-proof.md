# Orb delight: current proof

The current implementation sits on the merged redesign. Current screenshots and driver reports are in `delight-redesign/`; older `delight-*` captures show the superseded violet prototype and remain historical evidence.

## Behavior and blast radius

`assignEdition` derives an edition from the server-generated UUID at Free 1/50 or Plus 1/10 and saves a `golden` boolean before reveal/history storage. Existing flags are preserved. Reopening, sharing, upgrading and downgrading do not recompute the edition. Old readings with no flag remain ordinary. Gold changes only appearance and retains the speculative disclaimer.

`tests/delight.test.ts` executes the shipped function for 10,000 UUID prefixes: 200 Free and 1,000 Plus gold. Every saved result survives JSON serialization and a plan change unchanged. The tiny finite-range modulo bias is below one in a billion. These are structural/selection checks, not predictive-accuracy evidence.

The new optional reading flag remains inside the existing JSON prediction payload; the mirror copies that payload rather than projecting a fixed schema. No SQL migration is required. Device-local `ambientSound`, `ballStyle` and `cardStyle` preferences use the existing account storage. Missing sound means off. Both style renderers gate premium selections against the current Plus flag; an executable test proves downgrade fallback to Classic. The real browser drive additionally observed a boolean edition flag in a persisted real-model reading. Supabase account/mirror execution is not claimed verified in this lane.

## Runtime evidence

The updated project drivers cover a real local Ollama reading and Why, private 1080×1920 PNG, memory/edit/forget/Undo, history/outcome, Plus and credit simulations, safety, friend isolation, model-authored general questions, cancel, the actual 60-second timeout and retained answers. Browser errors and axe violations are checked by the drivers. The recovery driver now enters via Ask → Type instead because the Home suggestion buttons were intentionally replaced.

The targeted `scripts/drive-delight.js` uses a clearly labelled persisted-reading fixture for rare gold styling, separate from the real-model drive. It proves sound persistence, Free/Plus style gating, saved style choices, gold disclosure, PNG size, and ordinary Obsidian styling without a golden label. `scripts/drive-delight-audio.js` wraps real media methods (no playback stub) and observed pause during voice capture, resume for typing and pause when disabled. The scripts run in an isolated browser profile only.

The preview is on owned localhost:8093; default ports belong to other work. Temporary copies of the project drivers change only preview port and evidence destination. The preview's real same-origin bridge uses the already-running loopback Ollama engine; no shared process was stopped. Bridge method/origin/body-size checks passed.

Typecheck, 32 tests (one existing skip), and iOS bundle export passed. Device haptic feel, silent-switch behavior, native rendering/frame rate and actual microphone hardware remain unverified without Xcode/device setup. Native playback explicitly sets silent-switch-respecting mode, disables background playback and pauses during voice capture. Playback restores that mode after voice capture.

## Preserved failures and exclusions

The original MP4 success drive failed because the machine has no ffmpeg encoder. Firstmate explicitly excluded MP4 success because another lane removes video. PNG and recoverable export-error behavior remain covered; no successful video export is claimed.

The first post-rebase recovery drive targeted a removed Home suggestion; its transcript and screenshot are preserved as `recovery-suggestion-failure.*`. The corrected driver passed live. The first reduced-motion resume-count test ran concurrently with functional drives and missed its threshold; the unchanged isolated rerun passed. Both results are retained. Timing evidence and any remaining limitations are recorded with the motion audit, rather than described as a semantic or predictive pass.

## Motion gate remains blocked

The first isolated audit failed on typing (183.3 ms) and Share (250 ms); its trace shows GPU-process stalls without sampled main-thread long tasks. `delight-redesign/motion-first/` preserves that run. After removing the invisible Classic skin overlay, a second isolated audit measured typing and Share within targets, but planning recorded 50.1 ms against the strict 50 ms ceiling. That observation does not establish the overlay as the cause of the earlier stalls.

The second run also timed out in `perf-stop`, so it has no completed new trace or passing audit outcome. Its samples and complete failure transcript are in `delight-redesign/motion/`. The trace files in that directory are explicitly the first run, as identified by their provenance; they are not evidence of a successful second capture. All second-run averages exceed 58 fps, but the maximum-frame requirement is still unsatisfied. No threshold was relaxed. Under the repeated-obstacle rule, this is escalated to Firstmate before no-mistakes begins.

The final removal of the invisible Classic overlay passed typecheck; the preceding full test suite and iOS export predate that last conditional rendering change. Exact-head verification and no-mistakes remain outstanding.
