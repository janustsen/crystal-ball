# Motion

## Sub-features
Continuous fog in hero/Ask orbs, escaping wisps and warm glow; approach, listening, typing, question emergence, thinking, reveal, sharing, tabs and ambient sky; reduced motion.

## How to get to it (user POV)
Home orb or Ask tab starts the reading. Follow a real reading through the returned one or two questions, reveal and Share. You contains Reduce motion and Large text.

## Driving it
Run `node scripts/drive-motion.mjs` serially after functional drives. It creates its own Chrome session, records a DevTools trace and actual WebGL draw cadence at 390×844, then closes only that browser. `node scripts/check-motion-accessibility.mjs` proves OS/app reduced motion, resume, large text and skipped approach delay.

## Gotchas
Never profile concurrently with another browser drive or bundle build. A trace frame counter without WebGL draw counts cannot detect intentional 30fps throttling. Preserve failing timings. Native seamless layers use the native driver but need a device trace before claiming native fps. Reduced-motion browsers and WebGL-unavailable browsers deliberately show still artwork. The ambient sky has long randomized periods; wait to discover it.
