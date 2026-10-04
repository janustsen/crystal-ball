# Motion

The [motion language study](motion-language.md) preserves historical reference lessons. `src/motion.ts` owns current screen entrance tokens and easing; `src/Enter.web.tsx` uses compositor transforms with fully opaque text, while `src/Enter.tsx` uses React Native’s native animation driver.

`src/OrbVisual.tsx` composes painted interior, smoke, glass and stand layers on web and native. Smoke breathes with opacity and transform on an 8.6-second loop; backgrounding stops it. `src/Atmosphere` integrates the room, foreground and focus treatment. Reduced motion keeps smoke and camera still. The question stays on a parchment slip below the ball rather than animating across its glass.

`src/RevealOpening` and `src/useOpening.ts` own the staged opening, skip and completion timing; saved readings and returns from sharing do not replay it.

Use `scripts/check-apothecary-scene.mjs` for scene geometry, navigation, focus and frame timing, and `scripts/check-motion-accessibility.mjs` for app/system reduced motion. Run timing checks serially. The old WebGL fog renderer and `drive-motion.mjs` draw-count gate are historical; they are not proof for the painted renderer. Native device frame-rate evidence remains separate from compilation and browser proof.

## Orb delight

Golden editions retain the speculative label. Plus skins tint the glass without changing the reading. Home has no animated question whispers.

Native orb touches use a soft impact; thinking pulses every half glow cycle; a newly completed reveal uses a heavy impact. Ambient hum and reveal chime are optional, default off, pause during voice capture/backgrounding, and native playback respects the silent switch. Browser autoplay rejection is handled and a later deliberate tap can resume the enabled hum. Native haptic feel and silent-switch behavior still require device verification.
