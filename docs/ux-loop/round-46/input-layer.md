# Input ink hidden by decoration

A blind round45 reviewer found blank populated fields in the saved screenshots. The values were retained, but the plain PaperArt absolute-positioned sibling painted above the unpositioned TextInput. Draft and focus tests checked DOM state, and the contrast sampler only visited text nodes, so neither proved that input value glyphs reached the pixels.

Before the fix, check-input-ink.mjs filled the birthday day15, captured the field, made the input text transparent and captured again. Changed ink pixels:0 (required>40). The screenshots are identical, reproducing real occlusion. The failure is preserved in ink-failure/. This is not a missing-evidence penalty to dismiss.

The smallest fix is to position the shared TextInput above its decorative layer. The same pixel comparison must pass for day/month/year, question, expanded editor, first name, time and city at both normal and200% text. Existing draft/focus/no-request and contrast gates still apply; this check complements them rather than replacing them.
