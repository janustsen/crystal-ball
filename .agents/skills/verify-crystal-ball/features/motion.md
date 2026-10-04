# Motion

## Sub-features
Painted glass, stand and smoke integrated with the room; camera focus, layered depth, short screen entrances and staged reveal opening. Reduced motion keeps a still composition. See [motion](../../../../docs/design/motion.md) and the [Apothecary thesis](../../../../docs/design-thesis.md).

## How to get to it (user POV)
Home orb or Ask tab opens the focused room and Type / Speak choice. Follow a real reading through its returned questions, reveal and Share. You contains Reduce motion and Large text.

## Driving it
Run `node scripts/check-apothecary-scene.mjs` serially after functional drives for table/ball geometry, room destinations, camera focus and frame timing. Run `node scripts/check-motion-accessibility.mjs` for app/system reduced motion and static smoke, and `node scripts/check-reveal-opening.mjs` for ordinary/golden opening, skip, Close and saved-reading integrity. These rendering fixtures do not prove model behavior.

## Gotchas
The earlier `drive-motion.mjs` WebGL draw-count gate belongs to the superseded renderer. Never profile concurrently with another browser drive or bundle build. Preserve failing timings. Native-driver animation still needs a device trace before claiming native frame rate; a web drive or native bundle is insufficient.
