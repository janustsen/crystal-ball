# Native glass ball, 2026-10-09

- `ios27-sim-home.png`, `ios27-sim-ask-spot.png`, `ios27-sim-ask-ball.png`, `ios27-sim-tab-orb.png`: a debug build on the
  iPhone 17 simulator (iOS 27, Xcode 27), with the simulator's Reduce Motion on. The Ask-spot captures forced the room
  to the Ask spot in a local debug bundle (the deep-link confirmation needs a tap no tool here can give). The tab orb
  capture predates the change keeping its stars off the label.
- `home-ball-web-vs-ios27-sim.png`: Home's ball on web (left) and iOS (right) at the same scale, both reduced motion.
- `web-tab-orb.png`: the web tab orb after the label-contrast change.
- `fog-tiles-before.png` / `fog-tiles-after.png`: four tiled copies of the static orb's fog, before and after the seam fix.

Boundaries: the simulator's OpenGL ES is the Apple Software Renderer (one glass frame takes 20 to 50 s), so these prove
the native image, placement and lighting, not frame rate. Device frame rate still needs a phone. Web refactor output
was pixel-compared to the previous live capture (mean absolute difference 0.001 at Home and 0.034 at Ask, of 255).
