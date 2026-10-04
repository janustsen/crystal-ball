# Apothecary browser evidence — round46

This is provisional browser grading. Physical iPhone/VoiceOver, native keyboard, tilt, native performance and actual purchase/share-sheet hardware behavior remain unverified and deferred. Centered text is an explicit owner constraint. Judge actual pixels honestly, not intended material names.

Inputs have a solid aged-paper writing viewport, an8px inset from the decorative frame, and dark ink. The input is explicitly above the artwork. A direct pixel test fills and screenshots each real input, hides only its ink and compares the result. All16 cases (birthday day/month/year, question, expanded editor, first name, time and city at100/200%) show rendered value glyphs, with minimum10.706:1 foreground/background contrast. DOM value retention alone is not used as proof of visible text. Text-node contrast checks separately pass18 scenes/276 checks plus60 Why/Share scenes/741 checks, without failures.

Expanded editor checks pass24 width/height/scale combinations:360/390/430 ×500/844 ×100/200%, full draft preservation, Done/Cancel, focus restoration, no implicit request, scrolling and zero axe violations. Constrained390×500 at200% retains a500-character question, custom answers, accessible labels, scroll cues and subject focus; empty/full-name validation rejects invalid subjects and accepts a first name.

Age editing passes both scales: invalid and partial drafts, under13 restriction/correction, Cancel, valid save/reload, focus and zero axe violations. Birth-details checks pass both scales with actual city lookup, Back-retained drafts, invalid time, optional Skip, calculation/save/reload/forget, and controlled no-results/503 followed by real recovery. The preserved screenshots show populated input values in these states.

Keyboard choice navigation, space selection, radio focus, custom-answer return, plan navigation and preserved prices/renewal/cancellation terms pass both scales with zero axe violations. Share/reminder modal checks pass360/390/430 at both scales, including clipboard denial fallback, copied/canceled outcomes and explicit browser-unscheduled reminders. navigator.share is mocked at the OS boundary; no message was sent or native notification scheduled.

Home passes390×844 and430×932 at normal/200%:60–70% width hero, no question overlap, default heading within2 lines, omen fit/label, navigation clearance and no horizontal overflow. Room destinations are captured after deliberate scrolling; the hero can be partly above the viewport in those navigation-detail captures. All three targets exceed44×44 and reach the named shelf/history, hearth/circles and cabinet/plans destination at both scales. Their labels and paintings now share a wooden mounting.

The live Ollama drive passes a real reading, explanation, saved history/outcome, actual1080×1920 image export, mock plans, sensitive redirects and error recovery; live/drive.json ends passed:true/errors:[]. Layout and performance fixtures remain explicitly synthetic and do not prove prediction quality. Billing is simulated. Connected social-service behavior is not established by the offline screenshots.

Both OS and app reduced motion stop animation; restoring motion resumes it and enlarged balls remain visible. Seven opening paths pass: normal, golden, app/OS reduced, keyboard Skip, interrupted exit, and early Share. Each saves once, return from Share does not replay, centered skip and zero page/axe errors. Opening videos and charge/release/settle frames are retained. This is browser interaction evidence, not a device frame-rate claim.

Typecheck and171 unit tests pass on the input correction; the later presentation-only expansion also passes typecheck. Full layout and isolated frame timing are recorded below when completed. No source changes occur during these captures.

Full layout passes318 cases (53 states ×360/390/430 ×normal/200%) with no overflow or other gate failure. It explicitly checks that finishing onboarding exposes the complete hero rather than retaining prior scroll offset. Current390px settled, enlarged and transition captures are included.

Isolated scene performance passes every original budget: >=58fps, p95<=20ms, maximum<=50ms, no long main-thread tasks, across Home, camera focus/pullback, all three destinations, typing, context, opening and Share. Actual minimumfps 60.001, maximum sampled frame16.800ms. Other task browser drives had finished before this sample; no host-load waiver. Geometry and destination/reduced-motion assertions also pass. See scene/scene.json.
