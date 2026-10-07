# Sharing

## Sub-features
Private 9:16 export; Friend-reading entry from Circles. Private Person readings enter through Ask; see [usage](../../../../README.md).

## How to get to it (user POV)
Sky → Circles → Ask about an opted-in friend → first name, or Share this glimpse on a reveal.

## Driving it with chrome-devtools-axi
Choose an opted-in friend in Circles and enter their first name, or create a friend link from Share; inspect friend mode. Export story card and inspect downloaded file dimensions and contents. Open the full story preview. The still export is generated locally; verify its error boundary with an injected canvas encoding failure.

## Gotchas
Seeded feed is labeled. Browser sharing may be canceled. Story-card exports exclude the question, answers and Why; the share screen’s friend link uses a generic prompt, never the private question. The automated friend test mocks only the share sheet. No automatic external posting.

Yes receipts and the golden set use the same still export; `scripts/drive-receipts-golden.mjs` checks both 1080×1920 PNGs and that No/Not yet offer no receipt. See [recording usage](../../../../README.md) for export contents, privacy, audio, sharing fallbacks and platform limits. `VERIFY_URL=http://localhost:8131 node scripts/drive-growth-loops.mjs` (start with unused quotas; see [claim persistence](../../../../SETUP.md#social-v2-delivery)) drives a sealed-link visitor's free web reading, the seal-first reveal, five consecutive exports across both clip variants (decoded end-card checks and ffprobe size/audio checks, with audio covering the whole video and durations within 1.5 seconds; paint counts and frames saved for diagnosis) and the same-network refusal. Real-time MediaRecorder capture can drift under machine load; the accepted timing limit is 1.5 seconds, not frame-exact synchronization. `CLIP_ONLY=1` skips the later quota scenarios for focused recorder verification. It injects OS share-sheet responses and an audio-asset failure; recording and engine calls run for real. Evidence: `docs/evidence/growth-loops/`.

See [recording usage](../../../../README.md) for Replay for recording and its privacy boundary. Verify that Done returns to the prior reveal/share state without generating another reading.

For the automated end-card regression alone, run `npm run test:reveal-recording` (Chrome, ffmpeg and ffprobe required). It executes the real canvas recorder and app audio with a fixture forecast, throttles requestAnimationFrame and the recorder frame timer across the end-card transition, and asserts that the timer delay occurred; platform imports are stubbed and model output is not tested. Both it and the growth-loop driver decode the final video frame and compare its title region with the required "search Crystal Ball" end card set on the app's ground. Retain failed exports under a separate `EVIDENCE_DIR` before rerunning. Native ImageBackground/captureRef export remains accepted as unverified for this PR because no Xcode/device lane is available.

`PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/playwright" VERIFY_URL=http://localhost:8112 node scripts/verify-positioning.mjs` drives three fictional live Ollama readings, all outcome choices and History persistence, simulated Plus cancellation, still export and clean replay with zero extra prediction calls. Install recorder support locally with `PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/playwright" npx playwright install ffmpeg`; system `ffmpeg` crops screen recordings to 1080×1920. Sample 3 forces the cosmetic golden flag. Evidence and clips: `docs/evidence/positioning/`. Existing failures must be preserved before reruns.
