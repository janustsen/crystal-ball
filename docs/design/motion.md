# Motion

The [motion language](motion-language.md) defines the shared primitives, reference lessons, easing and timings. `src/motion.ts` owns screen entrance tokens; `src/Enter.web.tsx` uses compositor transforms/opacity, while `src/Enter.tsx` uses React Native’s native animation driver.

`src/fogShader.ts` adapts the supplied reference into continuously advected domain-warped fog, without rotating the field. One persistent WebGL context draws both the hero and Ask orbs, including escaping wisps. While visible with motion enabled, it runs at display cadence and keeps its clock across state changes. Glow, embers and sky discoveries animate only transforms/opacity. Native `FogTiles` moves three seamless translucent fields with the native driver beneath transparent glass artwork; native wisps recycle only at zero opacity. Run `node scripts/render-fog.mjs` to regenerate those assets. No frame-sequence assets or per-frame React updates are used.

Reduced motion freezes the fog, removes entrances and hides sky visitors. Either the system preference or in-app setting skips the approach delay. Large text caps decorative orbs at 96 pt. The web fog stops scheduling animation callbacks while reduced motion is active, apart from one-off redraws for layout or content changes that apply the current mood immediately. Hiding the page cancels its pending callback; restoring visibility or disabling reduced motion resumes it without advancing through the paused interval. It cleans up on unmount. WebGL-unavailable browsers retain the still glass artwork. Native device frame-rate evidence is separate from compilation and browser proof.

## Home scene

Web Home runs the canvas Main three.js scene (r159, as the canvas loads it): refractive raymarched glass, candle flicker, drifting dust and pointer/tilt parallax. Reduced motion and hidden pages draw one frame and schedule no callbacks; a resize gets a fresh canvas. Native shows `assets/home-scene.jpg`, a frame captured from the web scene by `scripts/capture-home-scene.mjs`, until a native GL renderer exists.

## Orb delight

Gold editions add a rim/halo using the existing reveal entrance and retain the speculative label. Static Plus skins tint the existing glass; they do not change the fog renderer.

Native orb touches use a soft impact; thinking pulses every half glow cycle; a newly completed reveal uses a heavy impact. Ambient hum and reveal chime are optional, default off, pause during voice capture/backgrounding, and native playback respects the silent switch. Browser autoplay rejection is handled and a later deliberate tap can resume the enabled hum. Native haptic feel and silent-switch behavior still require device verification.
