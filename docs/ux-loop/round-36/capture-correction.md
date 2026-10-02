# Capture-purpose correction after independent review

The20 contrast-*-0.png images in screens/ are diagnostic background captures: scripts/measure-text-contrast.mjs temporarily sets text color transparent, samples the rendered pixels, and restores every original style in finally. They were mistakenly copied into the full-review deck despite runtime.md saying background diagnostics were excluded. Both reviewers identified and excluded these from product-state grading. They do not show a reachable text-free UI and do not replace the ordinary current reader/share captures.

Preserve the exact reviewed deck and both findings. Future decks must exclude the whole contrast-background set, not only filenames containing “background”. The489 numerical checks still use foreground colors recorded before hiding text and sampled actual backgrounds. This corrects evidence presentation, not a product failure or a passing score.
