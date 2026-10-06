# Sharing

## Sub-features
Private 9:16 export; Friend-reading entry from Circles. Private Person readings enter through Ask; see [usage](../../../../README.md).

## How to get to it (user POV)
Sky → Circles → Ask about an opted-in friend → first name, or Share this glimpse on a reveal.

## Driving it with chrome-devtools-axi
Choose an opted-in friend in Circles and enter their first name, or create a friend link from Share; inspect friend mode. Export story card and inspect downloaded file dimensions and contents. Open the full story preview. The still export is generated locally; verify its error boundary with an injected canvas encoding failure.

## Gotchas
Seeded feed is labeled. Browser sharing may be canceled. Story-card exports exclude the question, answers and Why; the share screen’s friend link uses a generic prompt, never the private question. The automated friend test mocks only the share sheet. No automatic external posting.

Yes receipts and the golden set use the same still export; `scripts/drive-receipts-golden.mjs` checks both 1080×1920 PNGs and that No/Not yet offer no receipt. The still export is a 1080×1920 PNG. On web, a single Make clip tap records a 1080×1920 video in the browser (no server route): ball opening, theme, headline, check-back date, AI-generated label, watermark and a "search Crystal Ball" end card, with the app's own audio, then opens the share sheet directly or downloads the file if sharing is unavailable or rejected after recording. Canceling the share sheet does not download. Audio fetch/decode failures show the recording error instead of exporting a silent clip. The question is included only when its switch is on. `VERIFY_URL=http://localhost:8131 node scripts/drive-growth-loops.mjs` (fresh engine: web-reading limits are in memory) drives a sealed-link visitor's free web reading, the seal-first reveal, both clip variants (ffprobe checks size, audio and length; frames saved for inspection) and the same-network refusal. It stubs only the OS share sheet. Evidence: `docs/evidence/growth-loops/`. Native clip recording is an approved follow-up requiring a development build.

See [recording usage](../../../../README.md) for Replay for recording and its privacy boundary. Verify that Done returns to the prior reveal/share state without generating another reading.

`PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/playwright" VERIFY_URL=http://localhost:8112 node scripts/verify-positioning.mjs` drives three fictional live Ollama readings, all outcome choices and History persistence, simulated Plus cancellation, still export and clean replay with zero extra prediction calls. Install recorder support locally with `PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/playwright" npx playwright install ffmpeg`; system `ffmpeg` crops screen recordings to 1080×1920. Sample 3 forces the cosmetic golden flag. Evidence and clips: `docs/evidence/positioning/`. Existing failures must be preserved before reruns.
