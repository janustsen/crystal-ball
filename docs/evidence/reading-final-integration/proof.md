# Reading-flow integration proof

The recovered pipeline fixes and modal-Will correction are rebased on main f8f7f0a, preserving preview authentication, duplicate-prediction protection and delight behavior. All 57 tests and TypeScript checks pass; iOS export succeeds. Device execution remains unavailable.

Real authenticated Chrome + local Qwen drives passed onboarding, optional birth chart, 1–2 cards, dated forecast, free/Plus Why, 1080×1920 still PNG, saved history, mock purchases, teen Person reading, failure/retry without early credit charge, voice fallback, large text and legacy storage migration. The age-confirmation driver separately checks fresh/friend/legacy paths, accept/decline/reload and saved friend readings with explicitly labelled API fixtures; it does not claim live model coverage.

## Blast radius

Safety depends on one shared age-eligibility decision gating app entry, API requests and mirroring. tests/age-confirmation.test.ts runs the real profile and handler functions: missing confirmation, malformed age evidence and under-13 birthdays fail before model access; confirmed skippers remain teen-safe with no birthday/Sun sign; allowed friend readings retain mirror eligibility. Live browser fixtures prove persisted decline and legacy re-confirmation. Supabase transport is unconfigured, so remote RLS and successful network mirroring are not claimed.

The shared Person guard rejects mismatches before both engine entry points. The modal regression failed before the fix (modal-before.txt). It now passes through the actual app: a selected Will with “Will Jordan…” sends no request; “Will Will…” obtains real Qwen cards (modal.json). Ambiguous questions beginning only with the name Will may request a clearer phrasing rather than guess a subject. Fractional day/week/month/year horizons now reject consistently through card and forecast validation, preserving supported whole durations; regression tests call those actual functions.

The preview bridge retains authentication and same-origin checks, routes to the isolated engine port, and no longer exposes the removed video route. The corrected retry driver uses the normalized actual request URL: the retained first attempt missed its injected failure because it added a slash to /engine. That first reading completed normally; extras-failed.txt and reading-flow-extras-failed.json retain the failure. The subsequent actual fault injection and real-model retry pass.

These results establish app behavior, not predictive accuracy. Native share, microphone hardware, haptic feel, silent-switch behavior and native frame rate remain unverified. Historical failures elsewhere remain retained.
