# Opening reference study

Frames were fetched from actual online footage and inspected as contact sheets, not inferred from titles. Videos stay in .local; selected annotated-study sheets are evidence, not app assets. Times below are approximate visual measurements (125–250 ms sampling), not original source animation constants.

- Clash Royale: https://www.youtube.com/watch?v=3mvXKLFifZU — 90–95s sequence, cropped phone view in clash-opening.jpg. Chest drops in, compresses/settles, lid releases once, white-backed reward rises/tilts and turns into a stable face-up card. Around 500 ms landing, 250 ms lid/light release, 250–375 ms card rise/turn, then a readable hold. Light is anchored at the chest. No persistent camera shake is discernible at this sample resolution. The selected segment is ordinary rarity, not evidence for legendary timing.
- Brawl Stars: https://www.youtube.com/watch?v=HabNmI4gzK0 — brawl-overview.jpg, 500 ms samples. Repeated taps rotate the central star and change rarity colour; the final red star tightens and charges for roughly 1500 ms, releases in a very bright burst, then holds a silhouette before the reward enters. The clip is edited/social footage; it is useful for beat order, not exact engine timing or particle counts. Do not copy its full-screen flashes or repeated rarity rolls.
- Hearthstone: https://www.youtube.com/watch?v=8FdCFPtuf0g — hearthstone-opening.jpg, 18–23s at 250 ms intervals. Pack arrives centered, blue halo swells, pack tilts/scales, seams light in gold, then wrapper breaks once. Five cards fan outward and settle as the debris dissipates. Approximate charge 1500 ms, release 250 ms, fan/settle 750–1000 ms. Several dozen debris/spark elements are visible; exact particle count and easing cannot be recovered from footage.
- Genshin wish: original captured animation distributed by https://github.com/shadorki/genshin-impact-wish-simulator/blob/master/docs/videos/5starwish-single.mp4 — genshin-opening.jpg at 250 ms intervals. Cloud aperture gathers around a point, comet moves across a stable camera, trail changes blue to gold before impact, then one dominant release. Roughly 1000 ms aperture, 1500 ms travel, 1000 ms gold recognition, 2000 ms approach/release. Its full-screen white transitions are unsuitable for this app. The initially found YouTube clip https://www.youtube.com/watch?v=6Q2HvwOKX20 substitutes a joke reward; its payoff is excluded and a clean captured animation was obtained instead.

## Adaptation to Crystal Ball

Keep the orb illustration and Open mist. One local sequence, no random rarity roll and no recurring flashes. Golden edition is presentation only and retains the same uncertainty.

| Beat | Normal timing | Motion |
|---|---:|---|
| Contact / anticipation | 0–180 ms | Small compression (1.025 × .975), returns with weight |
| Wobble / charge | 180–900 ms | Three restrained alternating rotations (up to 2.5°); warm internal seam/glow grows once |
| Release | 900–1120 ms | Glass halves separate slightly, one bounded amber ring; 8 embers, no camera shake |
| Payoff | 1000–1700 ms | Forecast rises 32 px, unwinds from 4°, overshoots 3 px once and settles; text stays readable |
| Rest | after 1700 ms | Real result and controls, no replay on History |

Golden: 250 ms longer charge, warmer rim, 12 embers instead of 8; no brighter full-screen layer. Transform/opacity only on animation layers. Ease-in charge and cubic ease-out settle, not linear slide. Reduced motion uses a calm 180 ms crossfade without shake, particles, scale, rotation or positional travel. Close remains available. Skip is available after the first completed opening (and any interruption must not lose the already saved forecast). Home approach should stop claiming the ball is opening before the question exists; the meaningful opening belongs to the result.

Before capture: before/opening-and-reveal.webm, controlled response to make the visual boundary repeatable; not a model-quality claim. Current implementation uses a 650 ms approach screen and a generic 550 ms result slide, with no staged orb opening. This explains the disconnected object/result transition.
