# Motion

## Sub-features
Continuous cel-shaded fog in hero/Ask orbs, levitating glass, escaping wisps and warm glow; short lifts with fully opaque text, a longer reveal entrance, and one fine ripple on the hero orb; parallax star layers and ambient sky; reduced motion. Names and timings: docs/design/motion-language.md.

## How to get to it (user POV)
Home orb or Ask tab starts the reading. Follow a real reading through the returned one or two questions, reveal and Share. You contains Reduce motion and Large text.

## Driving it
Run `node scripts/drive-motion.mjs` serially after functional drives. It creates its own Chrome session, records a DevTools trace and actual WebGL draw cadence at 390×844, then closes only that browser. `node scripts/check-motion-accessibility.mjs` proves OS/app reduced motion, resume, large text and skipped approach delay.

## Gotchas
The hero ripple is appended to `.tap-layer` and removed after 700ms. Other controls do not generate particles or distort their text. Never profile concurrently with another browser drive or bundle build. A trace frame counter without WebGL draw counts cannot detect intentional 30fps throttling. Preserve failing timings. Native seamless layers use the native driver but need a device trace before claiming native fps. Reduced-motion browsers and WebGL-unavailable browsers deliberately show still artwork. The ambient sky has long randomized periods; wait to discover it.
