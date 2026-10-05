# Motion

The [motion language](motion-language.md) defines the shared primitives, reference lessons, easing and timings. `src/motion.ts` owns screen entrance tokens; `src/Enter.web.tsx` uses compositor transforms/opacity, while `src/Enter.tsx` uses React Native’s native animation driver.

`src/fogShader.ts` adapts the supplied reference into continuously advected domain-warped fog, without rotating the field. Outside the [Home scene](#home-scene), one persistent WebGL context draws the shared orbs, including escaping wisps. While visible with motion enabled, it runs at display cadence and keeps its clock across state changes. Glow, embers and sky discoveries animate only transforms/opacity. Native `FogTiles` moves three seamless translucent fields with the native driver beneath transparent glass artwork; native wisps recycle only at zero opacity. Run `node scripts/render-fog.mjs` to regenerate those assets. No frame-sequence assets or per-frame React updates are used.

Reduced motion freezes the fog, removes entrances and hides sky visitors. Either the system preference or in-app setting skips the approach delay. Large text caps shared decorative orbs at 96 pt; Home retains its scene composition and scrolls the scaled text. The web fog stops scheduling animation callbacks while reduced motion is active, apart from one-off redraws for layout or content changes that apply the current mood immediately. Hiding the page cancels its pending callback; restoring visibility or disabling reduced motion resumes it without advancing through the paused interval. It cleans up on unmount. WebGL-unavailable browsers retain the still glass artwork. Native device frame-rate evidence is separate from compilation and browser proof.

## Home scene

Web Home runs the canvas Library three.js scene (r159, as the canvas loads it): a faintly lit library room, refractive raymarched glass, candle flicker, drifting dust, pointer/tilt parallax and drag-to-spin with momentum, where a drag on the ball turns its mist and a tap without a drag starts a reading. Reduced motion draws one frame without a continuous animation loop; drag moves request a redraw, coalesced to the next animation frame, and release clears spin velocity. The camera orbit target is zero under reduced motion. Hidden pages cancel pending callbacks and hold the last frame; a resize gets a fresh canvas. The approved native scope for this PR keeps `src/HomeScene.tsx` displaying `assets/home-scene.jpg`, a frame captured from the web scene by `scripts/capture-home-scene.mjs`. Follow-up `cb-native-glass-scene` owns the live native GL scene and requires a real-device development build; Xcode and the Apple account are not set up yet.

## Orb delight

Gold editions add a rim/halo using the existing reveal entrance and retain the speculative label. Static Plus skins tint the existing glass; they do not change the fog renderer.

Native orb touches use a soft impact; thinking pulses every half glow cycle; a newly completed reveal uses a heavy impact. Ambient hum and reveal chime are optional, default off, pause during voice capture/backgrounding, and native playback respects the silent switch. Browser autoplay rejection is handled and a later deliberate tap can resume the enabled hum. Native haptic feel and silent-switch behavior still require device verification.
