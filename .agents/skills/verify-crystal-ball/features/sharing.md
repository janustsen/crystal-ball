# Sharing

## Sub-features
Explore seeded prompts; friend link; private 9:16 export.

## How to get to it (user POV)
Explore, or Share this glimpse on a reveal.

## Driving it with chrome-devtools-axi
Open a sample prompt, create friend link, inspect friend mode. Export story card and inspect downloaded file dimensions and contents. Open the full story preview. The still export is generated locally; verify its error boundary with an injected canvas encoding failure.

## Gotchas
Seeded feed is labeled. Browser sharing may be canceled. Story-card exports exclude the question, answers and Why; the share screen’s friend link uses a generic prompt, never the private question. The automated friend test mocks only the share sheet. No automatic external posting.

Only the 1080×1920 still PNG is exported. Animated/video export and the ffmpeg server route have been removed.
