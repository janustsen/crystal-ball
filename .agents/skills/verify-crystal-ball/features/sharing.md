# Sharing

## Sub-features
Private 9:16 export; Friend-reading entry from Circles. Private Person readings enter through Ask; see [usage](../../../../README.md).

## How to get to it (user POV)
Sky → Circles → Ask about an opted-in friend → first name, or Share this glimpse on a reveal.

## Driving it with chrome-devtools-axi
Choose an opted-in friend in Circles and enter their first name, or create a friend link from Share; inspect friend mode. Export story card and inspect downloaded file dimensions and contents. Open the full story preview and Read image text; each has a top Back to sharing control returning focus to its opener. The text view puts the public forecast and qualification before the image and can export the same PNG. scripts/check-enlarged-space.mjs covers both text sizes, focus and export. The still export is generated locally; verify its error boundary with an injected canvas encoding failure.

## Gotchas
Seeded feed is labeled. Browser sharing may be canceled. Story-card exports exclude the question, answers and Why; the share screen’s friend link uses a generic prompt, never the private question. The automated friend test mocks only the share sheet. No automatic external posting.

Only the 1080×1920 still PNG is exported. Animated/video export and the ffmpeg server route have been removed.

See [recording usage](../../../../README.md) for Replay for recording and its privacy boundary. Verify that Done returns to the prior reveal/share state without generating another reading.

`PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/playwright" VERIFY_URL=http://localhost:8112 node scripts/verify-positioning.mjs` drives three fictional live Ollama readings, all outcome choices and History persistence, simulated Plus cancellation, still export and clean replay with zero extra prediction calls. Install recorder support locally with `PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/playwright" npx playwright install ffmpeg`; system `ffmpeg` crops screen recordings to 1080×1920. Sample 3 forces the cosmetic golden flag. Evidence and clips: `docs/evidence/positioning/`. Existing failures must be preserved before reruns.
