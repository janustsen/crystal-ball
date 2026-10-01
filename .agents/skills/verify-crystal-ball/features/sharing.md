# Sharing

## Sub-features
Explore seeded prompts; friend link; private 9:16 export.

## How to get to it (user POV)
Explore, or Share this glimpse on a reveal.

## Driving it with chrome-devtools-axi
Open a sample prompt, create friend link, inspect friend mode. Export story card and inspect downloaded file dimensions and contents. Open the full story preview. Export MP4 when ffmpeg exists; otherwise verify the recoverable error without claiming video success. The primary driver injects HTTP 500 for one export and verifies recoverable error copy; that is a fault-injection check, not a claimed live outage.

## Gotchas
Seeded feed is labeled. Browser sharing may be canceled. Story-card exports exclude the question, answers and Why; the share screen’s friend link uses a generic prompt, never the private question. The automated friend test mocks only the share sheet. No automatic external posting.
