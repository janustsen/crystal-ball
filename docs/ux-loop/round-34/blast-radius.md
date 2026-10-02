# Round34 boundary checks

Entry now waits for an explicit input-mode choice. The important lifecycle boundary is that opening Ask must not start recognition, while choosing Speak must start once and leaving for typing must stop it. check-input-choice runs the real component with a controlled recognition constructor at normal/200%: zero starts during a900ms wait, one on Speak, one stop on Type, no additional start when typing directly. Physical microphone permission remains unverified.

Consent review remounts the scrolling screen while retaining question/recipient state in App. Safety depends on begin's existing explicit provider guard and no request from reviewing or toggling permission. check-question-consent drives normal/200%500px views: heading starts visible/focused, Not now returns focus and exact draft, opt-in sends nothing, revocation restores Review AI consent, re-opt-in then Ask sends exactly one request with the original question and named consent. Controlled local responses; no remote provider call. Native focus and keyboard are unverified.

Opening artwork changes from three clipped orb copies to one intact orb plus luminous fracture/mist. Completion bookkeeping is unchanged. All seven opening modes pass save-once, headline integrity, interruption/history, keyboard skip, early Share return without replay, and app/system reduced motion; zero page errors/settled axe violations. Native SVG typechecks but physical rendering/frame rate is unverified.

Existing text sizes, font assets, question engine, persistence shapes, credit spend and consent payload shape stay the same. Current full layout and actual local-model flows exercise the broader callers. No historical predictions are rewritten to obtain new explanation headings.
