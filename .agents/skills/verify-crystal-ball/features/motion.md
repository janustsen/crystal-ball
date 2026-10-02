# Motion

## Sub-features
Continuous cel-shaded fog in hero/Ask orbs, levitating glass, escaping wisps and warm glow; named transitions (smoke wipe, orb portal, ripple in, ink settle, card flip, inhale, glimpse burst, card deal); squash-and-spark tap feedback on every tappable; parallax star layers and ambient sky; reduced motion. Names and timings: docs/design/motion-language.md.

## How to get to it (user POV)
Home orb or Ask tab starts the reading. Follow a real reading through three questions, reveal and Share. You contains Reduce motion and Large text.

## Driving it
Run `node scripts/drive-motion.mjs` serially after functional drives. It creates its own Chrome session, records a DevTools trace and actual WebGL draw cadence at 390×844, then closes only that browser. `node scripts/check-motion-accessibility.mjs` proves OS/app reduced motion, resume, large text and skipped approach delay.

## Gotchas
Tap sparks are DOM nodes appended to `.tap-layer` and removed after 700ms; a tapped element carries `.tap-squash` for one animation. Never profile concurrently with another browser drive or bundle build. A trace frame counter without WebGL draw counts cannot detect intentional 30fps throttling. Preserve failing timings. Native seamless layers use the native driver but need a device trace before claiming native fps. Reduced-motion browsers and WebGL-unavailable browsers deliberately show still artwork. The ambient sky has long randomized periods; wait to discover it.
