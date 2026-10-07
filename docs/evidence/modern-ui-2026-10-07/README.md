# Modern UI refresh — before/after (2026-10-07)

Every screen at 390×844, before (modeled walnut/brass kit, PR #41/#42) and after (the Sky & History glass system). Web preview, Chrome.

| Sheet | Screens |
|---|---|
| [1-tabs.jpg](1-tabs.jpg) | Home, Sky, History (empty and saved), You, Plans, Sky and You at 200% text |
| [2-ask-flow.jpg](2-ask-flow.jpg) | Approach, listening (voice fallback notice), typing, follow-ups incl. "In my own words", thinking |
| [3-reveal-errors.jpg](3-reveal-errors.jpg) | Reveal, Why, check-in, share, story preview, errors (answers kept), sensitive redirect, 200% text |
| [4-more-screens.jpg](4-more-screens.jpg) | Enter/birthday, focus, age confirmation, today's omen, Inner Library (locked and Plus), Circles offline notice, scrolled Sky/You, notice, friend reading, saved reading, exported story card |
| [5-reveal-clip.jpg](5-reveal-clip.jpg) | Reveal clip (1080×1920 video): opening, forecast, end card |
| story-export-before/after.jpg | The exported 1080×1920 story card |

Sources: `scripts/check-layout.mjs` (labeled layout fixture, 24 states) for sheets 1–3; a local capture driver for sheet 4 (fixture forecast for the saved reading and export); `npm run test:reveal-recording` for the clip (fixture forecast). Before captures come from commit 6b11cb02 on the same preview; the clip's before row is the "after" row of `docs/evidence/share-plates/clip-frames-before-after.jpg`.

[layout.json](layout.json): 144 measurements at 360/390/430 px, normal and 200% text — no overflow and no label under WCAG AA contrast. These captures prove layout and appearance, not model behavior or predictive accuracy.
