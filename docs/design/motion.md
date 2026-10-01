# Motion

The [motion language](motion-language.md) defines the shared primitives, reference lessons, easing and timings. `src/motion.ts` owns screen entrance tokens; `src/Enter.web.tsx` uses compositor transforms/opacity, while `src/Enter.tsx` uses React Native’s native animation driver.

`src/fogShader.ts` adapts the supplied reference into continuously advected domain-warped fog, without rotating the field. One persistent WebGL context draws both the hero and Ask orbs, including escaping wisps. It runs at display cadence and keeps its clock across state changes. Glow, embers and sky discoveries animate only transforms/opacity. Native `FogTiles` moves three seamless translucent fields with the native driver beneath transparent glass artwork; native wisps recycle only at zero opacity. Run `node scripts/render-fog.mjs` to regenerate those assets. No frame-sequence assets or per-frame React updates are used.

Reduced motion freezes the fog, removes entrances and hides sky visitors. Either the system preference or in-app setting skips the approach delay. Large text caps decorative orbs at 96 pt. Rendering pauses while the page is hidden and cleans up on unmount. WebGL-unavailable browsers retain the still glass artwork. Native device frame-rate evidence is separate from compilation and browser proof.
