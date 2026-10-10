# Motion

## Sub-features
The [room](../../../../docs/design/motion.md#room) flights, loops and live ball, and shared orbs’ continuous cel-shaded fog, levitating glass, escaping wisps and warm glow; shared entrances and feedback effects; squash-and-spark feedback on shared tappable controls; parallax star layers and ambient sky; reduced motion. The [motion language](../../../../docs/design/motion-language.md) owns the effect inventory, triggers and timings.

## How to get to it (user POV)
Home orb or Ask tab starts the reading. Follow a real reading through the returned one or two questions, reveal and Share. You contains Reduce motion and Large text.

## Driving it
Run `node scripts/drive-motion.mjs` serially after functional drives. It creates its own Chrome session, records a DevTools trace and actual WebGL draw cadence at 390×844, then closes only that browser. `node scripts/check-motion-accessibility.mjs` proves OS/app reduced motion, resume, large text and skipped approach delay.

`PREVIEW_URL=<owned preview> node scripts/check-room-webgl.mjs` checks the room ball with a Plus style across GL support: WebGL1 (WebGL2 disabled) must compile the glass shader and draw the live ball; without WebGL the static orb must wear the chosen style. A shader that fails to compile throws at scene start, so the room falls back to that static orb.

## Gotchas
Tap sparks are DOM nodes appended to `.tap-layer` and removed after 700ms; a tapped element carries `.tap-squash` for one animation. Never profile concurrently with another browser drive or bundle build. A trace frame counter without WebGL draw counts cannot detect intentional 30fps throttling. Preserve failing timings. Native seamless layers use the native driver but need a device trace before claiming native fps. The iOS Simulator's OpenGL ES is the Apple Software Renderer: a frame of the glass ball takes tens of seconds there, so verify native glass images under the simulator's Reduce Motion (one frame) and measure frame rate only on a device. Xcode 27 builds need the scene life cycle (`EXExpoAppSceneDelegate`) in a fresh prebuild, or the app asserts at launch on iOS 27. For reduced-motion rendering and the fallback without WebGL, follow the [room contract](../../../../docs/design/motion.md#room). The ambient sky has long randomized periods; wait to discover it.
