# Heading omission in contrast measurement

At the failing enlarged Why overview, the DOM dump identifies `Behind the mist` as `H1`, role `heading`, top105px. The old collector selected only div/span/button/a, so it neither measured nor hid that text. Its gold glyphs appeared in the purported background beneath the oversized Close text range, producing1.81:1.

The focused browser regression first failed `Heading must be sampled`. The collector now scans body descendants and keeps its direct nonempty text-node filter, collecting foreground colors before hiding text. Its heading and neighboring-button samples now pass, and computed foreground is restored. Empty inline style is semantically equivalent to absent inline style after Playwright screenshot handling.

The actual unchanged product then passed all528 text checks across48 Why/Share samples at normal/200%, including all three enlarged overview phases. Thresholds remain3:1 for large text and4.5:1 for other text. No sample is waived. Both previous failed runs and DOM evidence remain alongside the corrected result.
