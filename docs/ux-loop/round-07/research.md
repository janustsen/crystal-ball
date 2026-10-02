# Crystal Ball — clean mobile UX research

Final scout report · 1 October 2026 (Los Angeles) · 15 reference apps · 27 prioritized incorporations · 17 design states plus variants

[Open the self-contained visual report](report.html) for annotated screenshots, reference comparisons and an interactive rubric calculator.

## Main finding

**Keep the gold-glass oracle. Make everything around the ritual quieter, faster and clearer.** Crystal Ball already has more animation than the cleanest references need. Its largest opportunity is motion hierarchy: immediate tactile controls, quick navigation, one expressive reveal, and an atmosphere that yields to reading. Do not flatten the app into a generic white wellness dashboard.

The first implementation batch should fix the misleading plans heading, quiet the utility-screen smoke, shorten routine transitions, and make the selected Sky question visible without scrolling. Then tune answer confirmation, reveal hierarchy, and share feedback. These are recommendations within the requested direction, not choices awaiting the captain. No implementation was performed.

### Research method and confidence

Reviewed primary product/design material, official screenshots, public recorded-flow galleries, and independent critiques for all 15 named references (counting Fitness and Journal separately), plus Apple HIG and WCAG. Reference-app behavior is **documented or gallery-observed**, not claimed as hands-on native testing. Several screenshots are historical; their dates and limitations matter more than a “2026” page title. Marketing claims, revenue figures, and ratings were not treated as evidence that a UX pattern works.

Drove the supplied live Crystal Ball URL in an isolated `chrome-devtools-axi` session at **390×844, mobile/touch, DPR 1**. Read the project's UI/motion authority and selected implementation entry points to avoid recommending features that already exist. Captured actual UI and completed a real reading using a fictional pottery question. No account login, public posting, real purchase, or source-code change. Native sound, haptics, keyboard, VoiceOver, frame rate, and prediction accuracy are not certified by this audit.

### Reference library: what to borrow, what to leave

| Reference | Evidence and why it feels good | Incorporation for Crystal Ball | Avoid copying |
|---|---|---|---|
| **Calm** | [Official scene controls](https://support.calm.com/hc/en-us/articles/115002474307-Calm-Scenes-Guide-Change-Background-Volume-Playback-Timer), [historical illustrated teardown](https://goodux.appcues.com/blog/calm-app-new-user-experience), [recorded-flow index](https://screensdesign.com/showcase/calm). A coherent environment, low-pressure starting point and clear daily destination make the experience feel settled. Scene volume and playback are controllable. | Let the orb supply atmosphere; give utility content a stable dark ground. Keep one daily omen. Put optional discovery beside the relevant action, not in an onboarding tour. | Full-screen promotional onboarding, many recommendations, automatic sound, or assuming the old screenshots are the current app. |
| **Headspace** | [Official motion guidelines](https://live.standards.site/headspace/motion), read live in browser; [motion reference gallery](https://60fps.design/apps/headspace). Its motion directs attention through pacing and layered scenes. The guide distinguishes narrative animation from 60fps in-app motion. | A living orb plus still task text; one small gesture of life after a meaningful act. Short rising fades for supporting copy, no perpetual movement on every layer. | Importing character animation everywhere or slowing UI to narrative frame rates. Full gallery videos may require Pro; no claim to viewing gated material. |
| **Co–Star** | [Independent iOS critique with screenshots](https://ixd.prattsi.org/2024/09/design-critique-co-star-ios-app/) documents a stark editorial identity and unclear signifiers. The visual economy is useful; the usability criticism is equally useful. | One strong serif forecast, one explanatory layer, a recognizable reusable share composition. Keep text labels on navigation and tappable elements. | Cryptic icon-only navigation, tiny type or emotional certainty. Visual minimalism is not sufficient usability. |
| **The Pattern** | [Official feature overview](https://www.thepattern.com/app-features), [public flow breakdown](https://screensdesign.com/showcase/the-pattern). Personal insights and relationship detail are organized into deeper layers; the official overview describes Bonds and Time Travel. | Keep the headline short and place reasoning/assumptions in the existing Why expansion; reveal depth on request. | Relationship labels as unquestionable truth, adding feeds, paid “deeper” explanations to basic trust information. Official page search extraction worked; direct open was unreliable. |
| **Sanctuary** | [Official app page](https://shop.sanctuaryworld.co/pages/our-app), [about page](https://shop.sanctuaryworld.co/pages/about-us). The service combines daily content, chart exploration and human readings; it frames interaction as a conversation. | Follow-ups should feel like one short question at a time; use explicit speaker/listening/transcript states. | Implying a live human is answering Crystal Ball, adding chat chrome or typing dots that simulate an operator. This source is descriptive marketing, not timing evidence. |
| **Apple Weather** | [Official illustrated guide](https://support.apple.com/guide/iphone/check-the-weather-iph1ac0b35f/26/ios/26). Current conditions precede hourly/daily information and tappable detail. | A clear first answer, then time horizon and expandable evidence. Dark surfaces protect text from the atmosphere. | Probability gauges that imply calibrated forecast accuracy, too many same-weight metric tiles. |
| **Apple Fitness** | [Official illustrated summary guide](https://support.apple.com/guide/iphone/see-your-activity-summary-iph4c34a8a95/27/ios/27). A glanceable summary leads to dated sessions and detail; progress is concrete. Source is the returned iOS 27 guide, not proof of availability on every device. | History should foreground question/date/outcome; gently acknowledge an outcome check-in once. | Activity rings, streak pressure or a percentage “accuracy” score without a valid method. |
| **Apple Journal** | [Official launch walkthrough and images](https://www.apple.com/newsroom/2023/12/apple-launches-journal-app-a-new-app-for-reflecting-on-everyday-moments/). Simple writing, optional prompts, browseable past entries and user control over suggestions reduce the blank-page burden. | A kind History empty state; a persistent short reflection prompt only when relevant; privacy clearly explained beside memory controls. | Claiming Journal's encryption/on-device privacy properties for this app. Copy the clarity, not the security claim. |
| **Arc Search** | [Official mobile guide](https://resources.arc.net/hc/en-us/articles/20887042551831-Arc-for-iOS-Android-Arc-Search), [iOS release notes](https://resources.arc.net/hc/en-us/articles/23528454620311-Arc-Search-for-iOS-Release-Notes), [gesture gallery](https://60fps.design/apps/arc-search). Reachable controls, minimal chrome, gesture feedback; refresh triggers on release and can be canceled. | Keep Type/Speak and primary actions thumb-reachable. Use a small, interruptible expansion from share thumbnail to story preview. Optional Sky refresh should preserve content. | Hidden gestures as the only path, custom pinch interaction for ordinary reading, AI polish that hides weak answers. |
| **Things 3** | [Official feature walkthrough](https://culturedcode.com/things/features/), [gesture help](https://culturedcode.com/things/support/articles/1059358/). Strong headings, whitespace and focused detail keep lists legible; interaction is tactile without needing a decorative backdrop. | Quiet grouped settings rows, date-grouped history, an inline edit state and reversible feedback. | Turning You into a task manager, inventing custom gestures when a visible action already works. |
| **Duolingo** | [Official milestone-animation case study](https://blog.duolingo.com/streak-milestone-design-animation/). The team connects visual meaning, pacing and a shareable reward; this is milestone evidence, not a mandate to celebrate every tap. | A tiny gold seal/checkmark on a saved outcome; one coherent reveal moment and a legible story card. | Confetti after every answer, guilt, streak losses, animating success when a forecast fails. |
| **Finch** | [Official product overview](https://finchcare.com/about-finch), [new-user guide](https://help.finchcare.com/hc/en-us/articles/42149821015693-New-User-Guide). Small goals and encouragement make starting easier; the companion gives actions emotional meaning. | Warm empty/error copy and a very small orb response to deliberate touch. Affirm checking back, not the prediction being “right.” | Pet economies, unlock trees and a new avatar system. Crystal Ball already has its companion object. |
| **Airbnb** | [Official 2025 app release with screenshots](https://news.airbnb.com/product-releases/airbnb-2025-summer-release), [Lottie project](https://lottie.airbnb.tech/). Rich imagery coexists with task-oriented destinations and a clear information hierarchy. | Give each tab one job; use one primary action per moment and quiet utility rows. Keep tactile detail on controls. | Adding a motion runtime or 3D icons just because Airbnb uses sophisticated production assets. |
| **Linear mobile** | [Team's material and interaction case study](https://linear.app/now/linear-liquid-glass). Small touch responses, disciplined depth and an Increase Contrast variant; the team explicitly leaves out refraction to preserve readability. | A subtle selected-tab plate, quiet press feedback and solid text backplates. Preserve the existing brass aesthetic but lower secondary visual weight. | Rebuilding Liquid Glass, refraction behind text, copying desktop density. |
| **Opal** | [Official product page](https://applink.opal.so/), [brand kit and screenshots](https://brandkit.opal.so/). The hero object carries much of the identity; milestones and material richness have a defined role. | Keep the gold sphere as the signature object. Reserve the strongest glow and sparkle for deliberate touch/reveal; surround it with negative space. | Literal copying of gemstones, score metaphors, or applying partner-brand black/white rules wholesale to Crystal Ball. The included promotional screenshot is not a live unframed app capture. |

### Principles that repeat across the references

1. **Hierarchy beats minimalism.** A screen can be richly illustrated and still clean when there is one visual destination. Decorative detail becomes noise when it competes with the task.
2. **Stable spacing makes richness feel intentional.** Align repeated labels and content edges; group related controls more tightly than unrelated sections. Use a small type scale, not a unique size for every block.
3. **Atmosphere belongs behind the experience.** It must not continually change the text's apparent contrast. The orb can be magical while History is calm.
4. **Motion explains a state change.** Press response, a changed selection, an opening detail, or a completed export gives animation a job. Screen-wide fireworks for a settings tap do not.
5. **Good waiting is truthful waiting.** Reserve space, show real state, retain input, permit cancel, and explain recovery. Skeletons suit known list geometry; they are a poor metaphor for an unknown forecast.
6. **Personalization needs visible control.** Memory should explain itself, remain editable and be easy to forget. That is already a strength in Crystal Ball.
7. **Small completion moments beat constant rewards.** Quietly confirm the action that actually happened. Never celebrate predictive certainty.
8. **Accessibility is part of the aesthetic.** Readable type, stable surfaces, alternate input and less movement are premium qualities, not a separate theme.

### Concrete visual and interaction targets (proposed, not measured competitor tokens)

- **Spacing:** retain ~24px content gutters at 390px; use 8/12/16/24/32 rhythm. Related label/help 4–8; row gaps 12–16; section breaks 24–32. Use content-aware wrapping, not fixed heights for text panels.
- **Type:** retain IM Fell English for page/reveal headings and Hanken Grotesk for tasks. Suggested roles: 32/38 hero, 26/32 section, 17/25 body/action, 14/20 helper, 12/16 metadata. Avoid serif italic plus glow plus movement on the same task label. Do not change the protected wordmark/tab graphic size without checking project authority.
- **Surfaces:** retain ink, ivory and brass palette. Three roles: ambient room; stable content surface; bright primary action. Lower the shadows/rims of secondary settings rows, keeping their role recognizable. Do not add glass blur to every card.
- **Contrast:** test rendered backgrounds throughout the smoke cycle, not only token pairs. Ordinary text 4.5:1; large text 3:1 under the WCAG definition. All essential content must remain legible when reduced motion freezes an arbitrary frame. [WCAG contrast explanation](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Targets:** at least 44×44pt per Apple guidance, with room between adjacent actions. Text labels, stable selected state, visible focus and accessible names matter as much as icon beauty. [Apple UI design tips](https://developer.apple.com/design/tips/).
- **Motion:** suggested experiment ranges: press 80–120ms onset / 140–180ms release; ordinary transition 160–220ms; answer transition 220–300ms; exceptional reveal 450–650ms. These are hypotheses to test, not numbers claimed from Apple or competitor apps. Keep input responsive throughout. [Apple motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion?changes=l_9_3).
- **Sound/haptics:** sound remains opt-in; no ambient reward buzzing. Distinguish touch, committed selection and completed save; keep visual equivalents. Native haptics already exist; tune them on a real device before expanding. [Apple feedback guidance](https://developer.apple.com/documentation/applepencil/playing-haptic-feedback-in-your-app?changes=_4).

## Rubric: score the screen AND its components

Grade each dimension 0–10. Aesthetic score A = mean of hierarchy, typography/spacing, surface/color coherence. Functional score F = mean of task clarity, feedback/recovery, accessibility. Overall = 0.4A + 0.6F, rounded to one decimal. Apply the same six dimensions to each screen and each meaningful component (orb, tabs, option, input, card, button, modal). Mark genuinely inapplicable dimensions N/A and normalize; never infer an interaction score from a screenshot.

- **6 — usable but visibly rough:** task succeeds; inconsistent spacing, competing emphasis, or weak feedback is obvious. No data loss or unreachable primary action.
- **8 — clean and dependable:** one clear next action; consistent type/spacing/surface roles; responsive press/loading/error states; 44pt targets; text enlargement, contrast and reduced motion checked. Minor polish remains.
- **9 — premium and effortless:** all 8 criteria plus continuity through transitions, contextual recovery, concise humane copy, restrained delight, no distracting layout shifts; real phone and assistive-technology checks passed.
- **10 — exemplary for this task:** all 9 criteria; repeated novice use and representative accessibility/performance checks find no material friction. Reserve for demonstrated outcomes, not taste or resemblance to another app.
- **0–5:** 0 absent/unusable; 2 major path broken; 4 task possible only with workarounds; 5 works but a serious clarity/accessibility issue remains.

Hard gates: blocked or materially unanswered task/data loss/error disguised as success => overall at most 4. Essential unreadable content, inaccessible primary control or motion preference ignored => at most 5. Unverified runtime/native behavior => provisional grade, cannot certify 9/10. Averages never erase a failed gate.

Loop acceptance: every core screen and critical component >=8, A and F each >=8, no hard-gate failure. Record before/after screenshot at 390×844, action and result, normal/200% text, reduced motion, empty/loading/error/selected state and any untested boundary. Change one issue at a time; keep every failed observation. Browser checks do not prove native haptics, voice, keyboard or screen reader behavior.


## Screen-by-screen live audit

All ratings below are **provisional expert judgments**, not user-study results or a release certificate. Six columns implement the rubric: **H** hierarchy, **T** type/spacing, **S** surfaces/color; **C** task clarity, **R** response/recovery, **X** accessibility. Runtime behavior was observed where described; X remains a conservative 6 because full per-screen contrast, keyboard, assistive technology and native checks were not run. The HTML includes the actual captures and annotations. Grade the current rendered version again before applying changes: this is a shared live preview, not an immutable build pinned to the local checkout.

| Screen / evidence | H | T | S | C | R | X | A / F → overall | Assessment |
|---|---:|---:|---:|---:|---:|---:|---|---|
| [01 Home](report.html#capture-home) | 8 | 8 | 8 | 8 | 6 | 6 | 8.0 / 6.7 → **7.2** | Strong orb/instruction pairing. Unavailable omen occupies the large daily panel and reads like an oracle answer. Keep identity; improve failure wording (14), motion allocation (05/07). |
| [02 Approach](report.html#capture-approach) | 8 | 8 | 7 | 6 | 6 | 6 | 7.7 / 6.0 → **6.7** | Live “Come closer…” stage confirmed and captured. Lovely once, but a timed detour before usable input. Shorten/merge repeated entrances (15). |
| [03 Listening / unsupported voice](report.html#capture-listening) | 7 | 8 | 7 | 5 | 7 | 6 | 7.3 / 6.0 → **6.5** | “Speak your question” and Start listening coexist with unavailable-voice notice. Type instead works. Prioritize the usable mode (11). Actual microphone capture not exercised. |
| [04 Typing](report.html#capture-typing) | 7 | 8 | 7 | 7 | 7 | 6 | 7.3 / 6.7 → **6.9** | Large serif prompt is attractive; input and submit work. Smoke runs behind helper copy. Keep borderless composition but strengthen focus/readability (05/11). Physical keyboard geometry untested. |
| [05 Follow-up, centered](report.html#capture-reading-result) | 8 | 8 | 7 | 7 | 7 | 6 | 7.7 / 6.7 → **7.1** | Live question 1 of 4: current level. Clear short choices and progress. Auto-advance worked. Four cards exceed the brief’s 1–2 intent (09/10). |
| [06 Follow-up, staggered](report.html#capture-card-two) | 6 | 7 | 7 | 6 | 7 | 6 | 6.7 / 6.3 → **6.5** | Daily-time choices zigzag; the eye crosses the whole phone and re-learns layout. Preserve character with a slight offset at most; align hit areas and shorten departure (09). |
| [07 Follow-up, left aligned](report.html#capture-card-three) | 7 | 7 | 7 | 6 | 7 | 6 | 7.0 / 6.3 → **6.6** | Practice-feedback question is readable but part of a longer-than-intended flow. Fourth question asks a deadline already loosely provided as winter. Ask only consequential missing facts (10). |
| [08 Thinking / long wait](report.html#capture-thinking) | 8 | 8 | 7 | 8 | 8 | 6 | 7.7 / 7.3 → **7.5** | Real plan/research stages, Cancel, “up to a minute,” then longer-wait message. Good foundation. Keep a stable text slot and calm the surrounding movement (17). |
| [09 Reveal](report.html#capture-reveal) | 7 | 8 | 7 | 4 | 6 | 6 | 7.3 / 5.3 → **4.0 cap** | Actual result does not answer pottery enjoyment, has a language-learning assumption, and conflicts with displayed date. Overall capped at 4 for failure to answer the intended task. Visual polish (12/16) is separate from relevance/date work (03/04). |
| [09b Why expanded](report.html#capture-why) | 7 | 7 | 7 | 5 | 7 | 6 | 7.0 / 6.0 → **6.4** | Honest speculative explanation and no invented current sources; useful disclosure. Dense facts and an irrelevant assumption weaken trust. Use stable expansion and readable hierarchy (18). |
| [10 Share](report.html#capture-share) | 8 | 8 | 8 | 8 | 6 | 6 | 8.0 / 6.7 → **7.2** | Preview plus understandable format rows is one of the cleanest layouts. Original private question is absent from card. Verify preparation/success/cancel feedback (19), keep this quieter surface vocabulary. |
| [11 Story preview](report.html#capture-story) | 8 | 8 | 8 | 8 | 6 | 6 | 8.0 / 6.7 → **7.2** | Actual rendered PNG preview and export control observed; attractive breathing room. Image delivery/OS share sheet not driven. Tune preview continuity without expensive bitmap scale (20). |
| [12 Error](report.html#capture-error) | 8 | 8 | 7 | 8 | 8 | 6 | 7.7 / 7.3 → **7.5** | One plan request deliberately rejected in this isolated browser. “Check your connection,” Try again and Edit question appear; balance stays 5. Calm recovery is good; quiet background and suppress celebratory effects. |
| [13 Sensitive redirect](report.html#capture-sensitive) | 8 | 8 | 7 | 8 | 8 | 6 | 7.7 / 7.3 → **7.5** | Real medicine question produces redirect and says no reading spent; displayed balance remains 5. Clear alternate action. Keep support-oriented language and still/quiet decoration. |
| [14 Plans](report.html#capture-plans) | 6 | 7 | 7 | 4 | 6 | 6 | 6.7 / 5.3 → **5.9** | Available 1 reading contradicts “mist has settled for today.” Both plan cards and simulate CTA fit; packs require scroll. Test mode is explicit. Fix context and reduce ornamental height (01/05). |
| [15 Sky / Tonight](report.html#capture-sky) | 6 | 7 | 7 | 6 | 7 | 6 | 6.7 / 6.3 → **6.5** | Six labeled sample stars; selected question/action below first viewport. Shared service offline status appears lower still; disabled My school unexplained nearby. Rebalance map, selected question and status (08/24). |
| [15b Circles](report.html#capture-circles) | 7 | 8 | 8 | 6 | 7 | 6 | 7.7 / 6.3 → **6.9** | Good privacy copy; empty CTA invites creation while shared backend is offline. “Sample stars” status is poorly matched to this pane. Surface contextual availability (24). No circle created. |
| [16 History empty](report.html#capture-history-empty) | 8 | 8 | 7 | 8 | 7 | 6 | 7.7 / 7.0 → **7.3** | Warm empty message, one Ask CTA and explicit device-local storage. Already a good pattern. Reduce smoke behind message; do not add onboarding carousel. |
| [16b History populated](report.html#capture-history-filled) | 8 | 8 | 8 | 8 | 7 | 6 | 8.0 / 7.0 → **7.4** | Saved real reading shows question, headline, date and Waiting. Good restrained panel. Need multi-item stress test; preserve scroll and date hierarchy (22). |
| [17 You / memory and preferences](report.html#capture-you) | 6 | 7 | 7 | 7 | 7 | 6 | 6.7 / 6.7 → **6.7** | Helpful memory explanation and preference controls. Three plans entry points across header/body add emphasis; secondary actions are heavy. Group rows; enlarge switches (02/13). |
| [17b You / 200% text + reduced motion](report.html#capture-you-large) | 7 | 7 | 8 | 7 | 7 | 6 | 7.3 / 6.7 → **6.9** | 390px spot check: no document horizontal overflow, 0 running CSS animations. Expanded memory heading takes substantial vertical space but scrolls. This is not full shader-stop or native accessibility proof. |

No overall app average is supplied: it would hide the failed answer-relevance case and under-tested native behavior.

## Prioritized implementation backlog

Effort estimates include focused implementation and browser verification, not deployment or native certification: **XS** 1–2 hours; **S** half a day; **M** 1–2 days; **L** 3+ days. Impact is a reasoned expectation, not a measured conversion claim. IDs are stable for the implementation loop. References link to the evidence library above; the specific timing and visual treatments below are our proposals.

| ID / priority | Concrete incorporation and location | Reference / current gap | Expected impact | Effort | Observable acceptance |
|---|---|---|---|---|---|
| **01 · P0** | **Contextual plans heading.** With credits available: “A little more possibility.” With zero credits: retain the exhausted wording. Show available balance once and avoid a second plans button inside Plans. | Things' contextual clarity; live Plans says “settled for today” while header says “1 reading.” | Removes a trust-breaking contradiction before payment intent. | XS | Open from Home/You at 1, 0 and simulated pack balance; wording matches all three. Test labels remain explicit. |
| **02 · P0** | **Make setting rows fully tappable.** Enlarge the effective switch target to at least 44×44, ideally the labeled row, without growing the switch drawing. Include a focus state. | Apple targets; live web switch bounds measured 40×20. | Easier one-handed use and accessibility. | S | Tap beside switch within row; one state change, no double toggle; keyboard/label work. Verify native separately. |
| **03 · P0** | **Keep the question's meaning through the answer.** Validate relevance and show an honest recovery if output answers another task; keep the original question available above Why. | Arc/Weather clarity; pottery-enjoyment question became generic learning progress, with a “basic conversation” assumption. | Prevents a polished but irrelevant answer. | M–L, separate behavior work | Same fictional question returns pottery-enjoyment relevance or an explicit inability, never silent substitution. One anecdote is not a general accuracy evaluation. |
| **04 · P0** | **Unify forecast horizon and check-back date.** Derive or visibly distinguish a check-in date from the forecast's stated horizon; rename “Due date” to “Check back” if it is just a reminder. | Weather's explicit temporal context; this run says 3 months but displays 2026-10-31 on 2026-10-01. | Removes a concrete contradictory cue. | S–M | Forecast horizon and reminder intent can be understood without opening reasoning; test relative dates and saved readings. |
| **05 · P1** | **Quiet utility-screen atmosphere.** Reduce contrast/opacity of room smoke on Sky, History, You and Plans; give body text a stable near-black backing. Preserve living gold-glass orb. | Calm/Headspace/Linear; live smoke crosses headings, toggles and helper copy. | Largest likely gain in perceived cleanliness and reading ease. | S | Text remains equally legible across captured smoke phases; the orb remains the dominant animated object. |
| **06 · P1** | **Fast ordinary navigation.** Replace the 700ms full smoke wipe/skew for utility tabs with 160–220ms opacity/≤8px translation. Keep tab bar stationary and preserve scroll position per destination where sensible. | Apple motion, Things, Linear; current `screen` transition is 700ms. | Removes repeated ceremony from frequent actions. | S | Switch tabs repeatedly; destination readable immediately, no dark curtain or blocked taps; reduced motion is instant. |
| **07 · P1** | **Restrict sparks/squash.** Keep tactile 2–3px press on brass primary controls; remove particles and large jelly distortion from tabs, settings, privacy and routine text links. Reserve one tiny gold ripple for orb touch. | Opal/Headspace; current global tap treatment sparks every tappable. | More premium, less game-like clutter; preserves the signature moment. | S | Settings navigation causes no particles; orb still rewards touch once; press cancels when finger leaves. |
| **08 · P1** | **Put Sky's selected question in view.** Reduce the constellation area's initial height to ~220–260px or place its selected question directly above/below within the first viewport. Add a subtle selected-star halo and a fixed-height text area only for small known samples, allowing expansion for long text. | Weather hierarchy, Airbnb task focus; map fills ~376px and action is below fold. | User understands what tapping a star does and can act sooner. | S–M | At 390×844, selected question and “Ask this too” appear with the star field; large text scrolls naturally. No fake community activity. |
| **09 · P1** | **Confirmation before answer departure.** Briefly show chosen chip's check/filled rim, then advance with a 220–300ms fade/short lift. Keep Back restoring selection. Standard choices still need no Next button. | Things tactile continuity, Apple feedback; present 780ms flip plus changing arrangements. | Confidence that the intended answer registered; less visual reorientation. | S | Fast double-tap records one answer; selected text remains perceptible; no delayed request just for animation. |
| **10 · P1** | **Honor the brief's 1–2-card intent.** Ask only the most useful missing facts; if more are truly needed, set that expectation before asking. Keep the actual count truthful. | Calm's relevant declared-data questions; live run delivered four cards. | Shorter path from curiosity to payoff. | M–L, engine/plan work | Representative questions use 1–2 useful cards or clearly explain a longer flow; known-fact skipping and fail-closed behavior preserved. Do not simply hide extra cards. |
| **11 · P1** | **Make voice fallback the primary action when unavailable.** If capability is absent, open typing or present a prominent “Type your question” control without an unusable listening invitation. Keep voice selectable when supported. | Sanctuary conversational clarity, Arc input reachability. Live HTTP browser enters voice and then says unavailable. | Removes an avoidable dead-end feeling at first use. | S–M | Fresh unsupported browser reaches a usable input promptly; denied mic retains question and gives an immediate alternate path. Native tested separately. |
| **12 · P1** | **Let the revealed answer own the screen.** Reduce the post-reveal orb to ~150–180px if needed for long headlines; keep the headline readable, place speculative label close, then one primary Share action and quiet follow-ups. Animate the container, never typewriter the answer. | Co–Star editorial economy, Weather layered detail. Live orb plus 4-line heading nearly fill the viewport. | Payoff is readable sooner; less ornament competing with meaning. | S | Short/long forecasts show their full headline and label without clipped content; no guarantee implied. |
| **13 · P1** | **Simplify You.** Group Preferences, Your memory, Plan, Privacy; make secondary actions rows rather than every row being a large brass button. Keep Forget everything visually separated at the bottom. Remove redundant plans entry if the summary row remains. | Things/Journal; current styles, plans, privacy all appear similarly weighty. | Faster scanning, less upsell dominance, clearer personal control. | S | Find motion, text size and forget a fact without confusing them with paid styles; preserve all existing controls and Undo. |
| **14 · P1** | **Plain unavailable omen state.** Retain the omen panel's size and heading, but say “Today's omen is unavailable” with a small explanation; distinguish this from a successful mystical message. | Finch humane copy, Apple status guidance. Current “stars are quiet” can read as an actual omen. | Honest daily ritual without a blank/fabricated forecast. | XS–S | A failed daily generation is recognizable; do not add automatic retries that violate the one-request-per-day cache contract. |
| **15 · P2** | **Gentle orb continuity.** Carry the visual center/size toward the next state with one 350–500ms transition, reducing stacked portal + approach delay + listening entrance. Keep Close responsive. | Headspace breathing object, Arc spatial metaphor. Existing 1000ms portal and 1100ms timed approach. | Ritual feels intentional without wasting repeat users' time. | M | Repeated Ask remains fast; no animation causes a second request; Reduce motion skips delay and movement. |
| **16 · P2** | **One restrained reveal crescendo.** Settle a thin rim glow, fade headline in 100–150ms later, optional single soft chime/impact. No full-screen burst, scaling text from 55%, or repeated celebration on history reopen. | Opal material focus, Duolingo meaningful milestones. Current reveal 1000ms with squash/stretch. | More anticipation, better legibility, less visual fatigue. | S–M | New result produces one effect; reopening saved reading does not replay a “new answer” reward; sound off stays silent. |
| **17 · P2** | **Truthful staged waiting.** Preserve current real planning/research messages, Cancel and long-wait copy. Reserve their layout so message replacement doesn't jump. Use one quiet orb response, not spinner + shimmer + percentage. | Arc documented loading evolution, Apple feedback. Existing flow already has useful stages. | Improves perceived control without pretending faster inference. | S | Slow/error/cancel all retain context; no fake percentage, fabricated fact or artificial minimum delay. |
| **18 · P2** | **Expand Why in place.** Animate height/opacity only, ~180–220ms, maintain the disclosure's position, expose expanded state and move focus appropriately when requested. Use 17/25 body for explanation, smaller metadata only for source dates. | The Pattern layered depth, Things detail expansion. Existing Why uses the typing entrance/skew. | Less reading disruption; evidence easier to scan. | S | Repeated expand/collapse doesn't lose scroll location; keyboard/screen-reader state is correct; large text wraps. |
| **19 · P2** | **Share-action feedback.** On export, label the pressed row “Preparing image…” and disable duplicate export only; success says “Saved” or “Ready to share” based on actual outcome. Errors stay by the action with Retry. | Duolingo share payoff, Apple feedback. Current preview exists; completion path needs explicit local feedback review. | Fewer repeated taps and clearer completion. | S | Success/cancel/failure produce distinct truthful states. OS sheet and native delivery require real device. |
| **20 · P2** | **Thumbnail-to-story continuity.** Use modest translation/fade between compact preview and full card; preserve the same crop, palette and headline. Keep a visible Back control. | Arc spatial transitions, Airbnb imagery. Existing share deal is already present. | Makes the preview feel like the exact object being exported. | S–M | No heavy scale animation on the large bitmap; preserve prior evidence that scaling caused rasterization stalls. |
| **21 · P2** | **A quiet selected tab.** Add a low-contrast static gold plate/short underline to complement label color; 120–180ms indicator fade, no icon bounce. Keep Ask orb largest but dim its ambient motion on utility tabs. | Linear touch hierarchy, Apple consistent color. | Makes location clearer without increasing visual noise. | S | Selection is obvious in grayscale and at increased contrast; no moving navigation while reading. |
| **22 · P2** | **History as a reading shelf.** Group by date, strengthen question/title hierarchy, make outcome a small labeled badge; preserve scroll on return from a saved result. Keep the existing empty CTA. | Journal/Things chronology, Fitness dated sessions. | Scannable history with a clear reason to return. | S–M | 0/1/20 long readings remain legible; chosen reading returns to its prior position. Do not invent filters before volume needs them. |
| **23 · P2** | **Confirm a check-in softly.** Briefly change outcome to a checkmark + “Saved”; announce once; no modal or confetti. | Finch encouragement, Duolingo earned acknowledgment. | Gratifying completion without implying forecast quality. | XS–S | “Yes”, “Not quite” and “Not yet” save equally clearly; no reward bias toward Yes. |
| **24 · P2** | **Make Sky offline status contextual.** Place “Showing sample stars” and recovery near the section title; in Circles say shared circles are unavailable instead of discussing stars that aren't visible there. Preserve existing content on reconnect. | Weather progressive detail, Finch humane recovery. | Clearer reason for disabled controls and sample content. | S | Offline Tonight/Circles each explain their own state before CTA; no public post or invitation as a side effect of retry. |
| **25 · P3** | **Pull-to-refresh only where data is refreshable.** If Sky needs it, standard pull/release with one restrained tick and last-updated status; keep visible retry. Do not refresh a generated forecast or daily omen by gesture. | Arc's release-triggered refresh. | Familiar manual recovery for a live feed. | M | Pull can be canceled before release; one request; stable content while loading; honors sample/offline truth. |
| **26 · P3** | **Optional sound refinement.** Existing hum/chime remain off by default; add a gentle fade on toggle, a visible volume choice only if users need it, and avoid sound during voice capture. | Calm's controllable scenes. Existing web hum pauses while listening/hidden. | Atmosphere without startle or interference. | S–M + native review | Toggle and interruption behave on actual phone; silent mode/accessibility checked; audio never conveys sole essential state. |
| **27 · P3** | **Contextual discovery, once.** After a first successful reading, one dismissible hint can point to saved History; show memory explanation when a fact first appears. | Calm contextual onboarding, Journal prompts. | Teaches value after it exists. | S | No startup tour, no blocking overlay, no repeat hint after dismissal. Existing Home instruction remains the only hero instruction. |

### Suggested execution order

**First half-day:** 01, 14 and the visual prototype for 05/06. **First polish batch:** 02, 05–09, 11–13. **Next:** 15–24, choosing the changes with visible before/after benefit. **Defer:** 25–27 unless user behavior supports them. **Separate correctness work:** 03, 04 and 10 should be promoted to implementation investigations; do not let cosmetic acceptance imply they passed.

The timing/material proposals would revise `docs/design/motion-language.md`, which currently mandates the more theatrical treatments. Treat this report as a proposed refinement, not a claim that the current implementation violates that authority. If adopted, update the authority and implementation together within the authorized UX loop. No additional captain decision is required to complete this knowledge deliverable.

## Component grades and what “8” requires here

Same rubric, provisional browser judgments. Components inherit the screen's hard gates when they participate in the failed task. These scores assess the component itself; the good-looking story card does not certify its forecast content.

| Component | H/T/S | C/R/X | A / F → overall | Smallest useful improvement / acceptance |
|---|---|---|---|---|
| Hero orb | 9/8/8 | 8/7/6 | 8.3 / 7.0 → 7.5 | Preserve it. One immediate touch response; no competing room motion (05/07). Native tactile response unverified. |
| Five-tab bar | 8/7/8 | 8/6/6 | 7.7 / 6.7 → 7.1 | Stable selected plate plus label; fast destination changes (06/21). |
| Primary brass button | 8/8/8 | 8/7/6 | 8.0 / 7.0 → 7.4 | Keep 54px minimum and press lip; distinguish disabled/loading without ornamental bursts. |
| Secondary settings action | 5/7/6 | 7/7/6 | 6.0 / 6.7 → 6.4 | Quiet row treatment, visible role and focus; avoid competing with the main action (13). |
| Answer chip | 7/8/7 | 7/6/6 | 7.3 / 6.3 → 6.7 | Selection acknowledgment survives long enough to perceive; one answer per tap (09). |
| Question input | 7/8/7 | 7/7/6 | 7.3 / 6.7 → 6.9 | Clear focused state, keyboard visibility and preserved question on retry. |
| Settings switch | 7/7/7 | 8/7/5 | 7.0 / 6.7 → 6.8 | Measured 40×20px on web; expand effective row target and test label activation (02). It is operable, so not an inaccessible-control hard cap. |
| Daily omen panel | 8/8/8 | 5/5/6 | 8.0 / 5.3 → 6.4 | Distinguish unavailable from a real omen without violating request limits (14). |
| Sky star + selected question | 6/7/7 | 6/6/6 | 6.7 / 6.0 → 6.3 | Pair map selection and answer/action within the viewport (08). |
| Disclosure / Why | 7/7/7 | 7/7/6 | 7.0 / 6.7 → 6.8 | No skew/slide unrelated to expansion; maintain context and expanded semantics (18). |
| Story preview surface | 8/8/8 | 8/6/6 | 8.0 / 6.7 → 7.2 | Match export; prove export completion, cancellation, error and large content (19/20). |
| Notice / error panel | 7/7/7 | 8/8/6 | 7.0 / 7.3 → 7.2 | Keep notice next to its action, announce once, retain input and meaningful retry. |

## Existing strengths to preserve

- Actual five destinations, a single dominant Home orb, an expressive but consistent palette and distinctive display type.
- Standard answers already advance immediately; progress already uses actual returned total. Do not add a needless Next button or fake two-step count.
- Planning/research already have live status, Cancel, an eight-second longer-wait message and a 60-second abort. Improve composition rather than invent another loader.
- Reduce motion, large text, ambient sound, memory edit/forget/Undo, speculative labeling, test-purchase labeling and sharing privacy copy already exist.
- Native selection/touch/success haptics already exist. Ambient hum and a reveal chime already exist on web, with listening/visibility suppression. A proposal to “add haptics/audio” would be duplicate work.
- Story share already renders the actual headline with a speculative label and excludes the original question, answers and reasoning. The calm share layout is a useful internal reference for You and History.

## Evidence ledger and reproduction notes

**Local source snapshot:** `726569efbc100c6800e8662ecd5a77cb4d8857b3` (`git rev-parse HEAD`). **Preview:** `http://janus-mac.tail8d2280.ts.net:8087/`. **Session:** `cb-ux-research`. Research/audit occurred 1 October 2026 Los Angeles time (2 October UTC). The shared preview may be rebuilt independently of this detached checkout; source findings are labeled local-source evidence, not a deployment hash assertion. Orb appearance varies between early and later captures; the report retains both rather than presenting a false immutable before-state.

### Commands and observations

Representative commands were executed serially for dependent browser actions:

```sh
CHROME_DEVTOOLS_AXI_SESSION=cb-ux-research chrome-devtools-axi open http://janus-mac.tail8d2280.ts.net:8087
CHROME_DEVTOOLS_AXI_SESSION=cb-ux-research chrome-devtools-axi emulate --viewport '390x844x1,mobile,touch'
CHROME_DEVTOOLS_AXI_SESSION=cb-ux-research chrome-devtools-axi snapshot
CHROME_DEVTOOLS_AXI_SESSION=cb-ux-research chrome-devtools-axi screenshot <worktree>/.local/cb-ux-research/home.png
CHROME_DEVTOOLS_AXI_SESSION=cb-ux-research chrome-devtools-axi eval '() => document.body.innerText'
git rev-parse HEAD
nl -ba src/motion.ts
nl -ba src/daily-omen.ts
nl -ba src/native.ts
```

Browser DOM actions used visible labels or test IDs to activate actual controls. Text was entered using the native textarea value setter and a bubbling input event. No React internal state setters or seeded successful predictions were used. Snapshot references became stale after other browser calls, so subsequent navigation used the authorized DOM route. The screenshot wrapper often returned `did not report a saved screenshot path`; the PNGs existed, were opened and inspected, and are embedded in `report.html`. These wrapper errors were not treated as product failures. An early blank-page capture and a premature “reveal” capture were replaced with inspected captures of the intended states; they are not evidence of app defects.

**Live route:** Home → Sky samples/offline → History empty → You → Plans with 1 remaining → Ask approach → unsupported voice → Type instead → pottery question → four actual follow-ups → planning/research and longer-wait message → reveal → Why → Share → Story preview → History populated → Circles offline → You 200%/reduced motion. A clearly labeled simulated five-reading pack was used only in this isolated profile to reach further states; no payment occurred. Then a medicine question produced the real sensitive redirect. Finally a one-request browser fault injection produced the recoverable Error screen.

**Reading transcript (fictional inputs):**

- Question: “Will I enjoy learning pottery this winter?”
- Card 1: “What is your level now?” → New beginner.
- Card 2: “How much time can you give it daily?” → 10 minutes.
- Card 3: “How often can someone review your practice?” → Rarely.
- Card 4: “When do you want to use it?” → In 3 months.
- Headline: “You will still be practicing the basics of your chosen skill in 3 months.”
- Why disclosed scenario thresholds and lack of external supporting evidence. Its assumptions also referenced “a basic conversation” and “fluency,” which do not fit pottery.
- Displayed “Due date · 2026-10-31” alongside that 3-month headline on 2026-10-01.
- Balance changed from 1 to 0 and the reading appeared in History with the original question and Waiting. This proves flow/persistence observations, not semantic correctness or predictive accuracy.

**Error evidence:** isolated-browser `fetch` wrapper rejected exactly the next POST whose JSON `action` was `plan`, restored the original fetch at interception, and passed all other requests through. No server was stopped. UI displayed “The mist is too thick,” a connection explanation, Try again and Edit question. Balance remained 5. This is a **synthetic network failure**, not a reproduced infrastructure outage. No retry-success claim is made for this injected case.

**Sensitive evidence:** “Will this medicine cure my illness?” returned “This one isn’t for the Ball,” a reliable-support explanation, alternative-question action and no-reading-spent notice. Balance stayed 5. This is a UI/classification observation, not a medical assessment.

**Accessibility spot-check output, You after enabling both preferences:**

```json
{"width":390,"overflow":false,"activeAnimations":0,
 "smallTargets":[
   {"label":"Ambient sound","width":40,"height":20},
   {"label":"Reduce motion","width":40,"height":20},
   {"label":"Large text","width":40,"height":20}
 ]}
```

These are DOM bounds of switch elements, not a physical-device hit test. A larger invisible native target could differ. No horizontal document overflow was observed in this spot check; it is not proof that every child of every screen fits. `document.getAnimations()` counted no running CSS animations; it does not measure WebGL draw activity. Preferences were returned to normal afterward.

### Local file:line evidence / handoff map

| File:line | What it establishes / likely implementation location |
|---|---|
| `docs/design/ui-rules.md:3` | Existing 17-screen visual authority; gold-glass, ink, brass, fonts. |
| `docs/design/motion-language.md:7` | Named expressive motion vocabulary and current design intent. Proposed restraint needs authority updated, not silently contradicted. |
| `src/motion.ts:3` | Shared press, tap and glow durations. |
| `src/motion.ts:6` | 700ms screen, 1000ms approach, 780ms question, 1000ms reveal, 720ms share timings. |
| `src/motionCss.ts:14` | Screen wipe/skew; later keyframes implement flip, inhale and burst. |
| `src/Atmosphere.web.tsx:17` | Global pointer feedback matches buttons/tabs/radios/links/switches and creates seven sparks. |
| `src/ui.tsx:15` | Shared Action component, disabled state and press lip. |
| `src/ui.tsx:26` | Shared action/panel/chip styling, 54px buttons, typography helpers. |
| `app/index.tsx:32` | Timed 1100ms approach → listening, skipped for reduced motion. |
| `app/index.tsx:40` | Longer-wait message after 8 seconds. |
| `app/index.tsx:53` | Abort timeout path. |
| `app/index.tsx:83` | Plans uses exhausted wording unconditionally, matching live contradiction. |
| `app/index.tsx:88` | You composition, memory controls and preferences. |
| `app/index.tsx:102` | Shared shell, atmosphere, named transitions, notice and five tabs. |
| `src/SocialScreen.tsx:53` | Tonight/Circles section navigation. |
| `src/SocialScreen.tsx:58` | My school disabled state when no school profile is available. |
| `src/SocialScreen.tsx:100` | Shared offline message at the end of the social content. |
| `src/daily-omen.ts:32` | Day claimed durably before inference; failures don't spend another request. Do not casually add refresh/retry. |
| `src/native.ts:6` | Native haptic mapping already exists; “success” currently maps to heavy impact. Tune by device testing. |
| `src/useDelight.web.ts:9` | Existing hum/chime volumes; lines 14–23 show visibility/listening and per-reveal behavior. |
| `src/retention.ts:12` | Explicit due date wins; otherwise a 30-day fallback. Explains the plausible source of date ambiguity, not proven remote response internals. |
| `server/engine.ts:67` | Local learning branch builds progress scenarios; line 72 adds language-specific assumption unconditionally. Relevant to pottery mismatch. |
| `docs/evidence/art-pass-2026-10-01/README.md:1` | Prior layout/motion testing, preserved failures and native boundary. Read for implementation constraints; not rerun/certified by this scout. |

### Image provenance and source-access limits

The HTML embeds **21 Crystal Ball audit captures** (including variants) and three reference images, all with captions. No network is needed to read the report or view them. External links remain optional evidence links.

- Calm reference: historical screenshot from [Appcues teardown](https://goodux.appcues.com/blog/calm-app-new-user-experience), showing daily content protected by light cards over a landscape. Not the current app version. A separate ScreensDesign image endpoint returned 403 and was not used.
- Linear reference: official [Liquid Glass case study](https://linear.app/now/linear-liquid-glass), normal versus Increase Contrast comparison. Downloaded official image, displayed without claiming endorsement.
- Opal reference: official [brand-kit screenshot 1](https://brandkit.opal.so/Screenshots/Image_1_Large.jpeg), a promotional device composition; retained uncropped/unannotated with commentary outside the image.
- Mobbin was found as a research catalog, but no authenticated library was accessed. Public ScreensDesign and 60fps pages supplied equivalent flow-discovery references; premium material was not bypassed.
- UI Sources' Calm URL redirected to the ScreensDesign homepage, so it was not used as evidence of a particular screen. Headspace's JS-only official guide was read successfully through `chrome-devtools-axi`. Some Apple HIG pages required JS; usable official motion/design tips and WCAG supported concrete recommendations instead.

## Implementation-loop handoff

For each chosen ID: pin the current preview/build, capture the affected before state, implement the smallest change, drive the exact interaction, then regrade the screen and component. Keep before/after at the same viewport and content. Do not substitute a synthetic successful forecast for a real run.

Before shipping a UI/service change, follow the project's `verify-crystal-ball` skill, `npm run check`, `npm test`, and appropriate layout/motion/accessibility drives. Use `blast-radius` for shared motion/style helpers and data/plan/date changes. Native verification remains a separate requirement. Prior evidence explicitly records occasional first-question mount timing failures and expensive large-image scaling; preserve those constraints and failures.

This is a scout report: no app code changed, no branch pushed, no merge or release gate claimed. The report and HTML are the durable handoff; scratch browser captures and generators live only in the disposable worktree. **Captain-call inventory: none.** Recommendations and observable defects do not require a new product choice to complete this research. Firstmate can promote the clear findings into authorized implementation work.

### Deliverable verification

Opened the final HTML through `chrome-devtools-axi`. All 24 embedded images decoded; no external scripts, stylesheets or image dependencies; zero broken internal anchors. Recommendation filter returned all 27 rows and 4 P0 rows. Calculator at all eights with task-failure gate correctly returned 4.0. Desktop and 390px mobile views were inspected; a too-wide select was found and constrained before delivery. The shared captain-call completion command reported `complete: cb-ux-research captain-call inventory reviewed` with `--none`. No source changes appear in `git status --short`.
