# Motion

The authorized Crystal Ball.html reference supplies the smoke shader, candle flicker, glass optics and embers in src/designArt.ts. The live web shader runs at at most 30 fps and stops when hidden or reduced motion is enabled. It measures the actual hero orb to keep smoke inside its current bounds. A static PNG rendered from the same SVG is the native counterpart (native react-native-svg lacks turbulence/displacement); native motion still needs device verification.

Tap Home's 240 pt orb (200 on short screens): the approach state shows a 300 pt orb, scaling from 80% to full size over one second, then opens listening after 1.1 seconds. Typing uses 170 pt; follow-ups use 130 pt. Screen entrances last 650 ms with opacity, scale and vertical movement; the second follow-up reverses the entry direction. Follow-up layouts alternate centered, staggered and left-aligned. Reveal opacity settles over 600 ms after a 200 ms delay. The pressed orb shrinks to 97% over 120 ms and releases over 180 ms.

The in-app Reduce motion setting skips the approach delay. Either the system preference or the in-app setting disables CSS animations, renders a static shader frame and removes entrance/reveal movement. Large text caps decorative orbs at 96 pt. Stop speech and rendering work when the owning screen unmounts. The video export remains four seconds and is separate from live UI animation.
