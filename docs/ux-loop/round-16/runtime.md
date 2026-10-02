# Round 16 — provisional browser review

Current product uses Open mist: borderless dark atmospheric content, quiet separators, illustrated gold Home orb and compact supporting copy. Preview needs no page login. Product source970ac56; subsequentf3f7119 changes contrast measurement only.

Screens are the actual implementation at390×844. Full sweep covers38 states across360/390/430, normal and200% text. Original17 core screens plus onboarding, profile forms, explicit person entry, explanation readers, error/loading/expanded variants are represented. Synthetic long fixture predictions stress layouts, not model quality. A synthetic three-card sequence is solely a stress fixture; real adaptive engine asks one or two cards.

This candidate makes question entry primary. A four-line multiline field precedes the About myself/person disclosure. Identity can change without losing the question; a person requires a first name and has explicit privacy guidance. Larger text really doubles the input24→48px, with increased editor height. Why Plus opens a four-category overview, then a dedicated reader with full reason, answers, assumptions or sources. All evidence words remain; free accounts immediately see their brief reason and upgrade action. Reader Back restores category focus; Back to forecast restores the original trigger. These readers scroll for long content. No content was shortened to improve screenshots.

Behavior evidence:
- compose-read/compose-read.json: normal/200%, at least4 visible editor lines, disclosure state, first-name validation, question retention, all four complete evidence categories, keyboard focus/return and reader Back visibility; free/Plus boundary; zero axe violations. Screens copied from this check include explicit200pct names.
- entry/entry.json: keyboard focus selection, one selected choice, explicit identity switching and retained question; zero axe violations in both text sizes.
- input-scale/input-scale.json: seven fields double exactly: onboarding/profile birthdays, birth time/city, fact, person name, question. Shared wrapper also used by social/school fields.
- forms/large-forms.json: enlarged custom answer including390×500 constrained viewport, retained question, long editable answer, visible Choices/Reveal, focus restored.
- home-chrome and home-webkit:390×844/430×932 normal/200%; orb about67% of app width, whisper nonoverlap, normal headline at most two lines, omen fit and clear navigation. WebKit is emulation, not physical Safari.
- orb-clip/clip.json: the atmosphere previously escaped the ScrollView behind the fixed header when enlarged pages scrolled; actual screenshot comparison now finds0 header pixels affected by the scrolled-out Home/composer orb. In-bounds glow and ambient mist remain.
- why/why.json: recorded real reading, complete reader content, browser focus/return, zero axe violations.
- real-drive/drive.json: actual local Ollama Spanish forecast, adaptive cards, reveal/free Why, real1080×1920 PNG, export recovery, history/outcome, memory edit/forget/Undo, simulated plans/Restore, sensitive redirect, connection recovery, Sky and preferences; zero axe violations/page errors.
- reading-flow/reading-flow-drive.json: real invalid/valid onboarding, current-focus edit, Copenhagen geocoding, calculated birth details, actual adaptive dated forecast, brief/deeper Why, PNG, history, simulated purchase, memory Undo, named-person validation, sensitive redirect and large Home; no page errors.
- export-feedback/feedback.json: two immediate export activations invoke one encode; Preparing disables export while Invite stays usable. Injected failure restores retry, then an actual PNG downloads. Screens show held export and recoverable error.
- task-contrast-corrected/contrast.json:528 rendered-background checks across48 samples of all Why readers and Share at both sizes, zero failures. Prior failure was a sampler excluding H1 glyphs from background hiding; DOM evidence and failing regression preserved. No threshold lowered.
- contrast/contrast.json:276 settled text checks, zero failures. Sampling is not every possible animation/native frame.
- Current typecheck and all118 tests pass. Real model drives preceded the atmosphere clipping-only fix; focused clip/composer and Home checks were repeated after it.

Unchanged verified contracts: Enter/Space advance answer once and move focus; Back retains answer; Other opens multiline with persistent question and Choices restores focus. Labeled preference rows support keyboard, persistence and focus outline. Home approach650ms, immediate reduced motion. Voice fallback makes typing primary. Outcomes save inline and persist. Image-only Share has real artifact, privacy explanation and optional Invite & remind. Simulated plans clearly disclose test mode. Skippable birthday/focus onboarding still requires age confirmation; under13 gates remain. No video.

Supplemental previous-round real SQL/Ollama social verification: isolated PostgreSQL with local auth/REST adapter, Circle joins/replay, consent and Plus friend readings, seals privacy/reactions/leave; school search/coarse location boundary, same-school membership/invites/change/remove/reload. Coordinates not stored/transmitted. This does not certify production Supabase/Auth or native geolocation. Supplemental stack closed; pictured main preview has sample stars/offline Circles.

Scope: provisional browser grades only. Physical iPhone Safari, native Dynamic Type, VoiceOver, real microphone/haptics, payments and OS share delivery remain a separate gate. Actual forecasts establish functioning inference, not predictive accuracy or broad semantic quality. No native certification inferred from browser evidence.

Current transition-contrast/contrast.json passes16 entrance samples with inherited opacity composited. Current motion/reduced-motion.json confirms OS/app preferences stop actual canvas draws and CSS animations, resume restores animation, enlarged Home retains both orbs and approach becomes immediate. Fresh outcome-feedback.json proves all three real save controls persist against an explicitly synthetic history fixture.

Refreshed current-head layout result:228 checks pass, no failures (screens/layout.json). All38 states across the three widths and both text sizes completed.

Current isolated motion/samples.json: every callback and actual WebGL-draw sample passed near60fps, maximum16.8ms, including45seconds of ambient Sky. No concurrent browser checks or graders ran during timing. This is host-browser timing, not iPhone hardware performance.
