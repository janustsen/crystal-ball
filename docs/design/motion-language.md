# Crystal Ball motion language

The ball is a small atmosphere behind glass. Movement behaves like fog finding a path, light settling on brass, and a thought coming into focus. The sphere remains the visual anchor; text is readable and controls respond immediately throughout motion.

| Signature | Where | Timing and behavior |
|---|---|---|
| Living mist | Hero and Ask orb, listening, thinking | Continuous domain-warped noise, independently drifting fields, no rotation or time reset. Soft wisps escape upward; glass reflections stay above the fog. Native uses three seamless translucent fields at different speeds, driven off the JS thread. |
| Gold breath | Both orb halos | A quiet 7.3-second light swell. Opacity and scale only; no changing blur radius. |
| Draw closer | Ball tap / Ask | A 1,000ms approach from 80% scale; immediate 180ms press response. No bounce or loss of input while settling. |
| Gather a thought | Follow-up questions | An 850ms rise or fall through 28px at 96% scale. The alternating direction distinguishes questions while retaining one visual grammar. |
| Settle into glass | Listening / typing / thinking | Respectively 700/520/900ms, 6–16px travel and restrained scale. Fog time carries through state changes. |
| Glimpse | Prediction / share | A 950ms reveal with 200ms text delay; sharing rises 24px over 650ms. Text is never animated character by character. |
| Pass through | Tabs and ordinary screens | A 500ms, 12px entrance. Controls compress subtly on press and settle over 180ms. |
| Sky discoveries | Background | Rare gold streak, passing crescent, faint constellation. Randomized long periods, invisible between appearances, always subordinate to the orb. |

`src/motion.ts` owns entrance durations and the shared settling curve: cubic-bezier(.2,.75,.2,1). It decelerates without overshoot: glass has weight, fog has softness. Native uses the same curve through the native driver; web uses compositor transforms and opacity. Ambient light has a smooth sinusoidal rhythm. Constant fog advection uses continuous time rather than easing to a stop.

Ambient rules: no sprite-frame playback, rotating noise plate, visible wrap, time reversal, or countdown. The web renderer survives mood changes; [motion lifecycle](motion.md) defines its display cadence and pause behavior. Native seamless tile endpoints contain the same pixels; differently sized layers and nonmatching periods conceal any combined pose. Escaping native wisps wrap only while fully transparent. Sky discoveries also reset only while invisible. Reduced motion shows a still, readable composition and hides sky visitors. Changing that preference must stop motion immediately.

## Reference lessons (bounded review, 2026-09-30)

- [Headspace’s motion guidelines](https://live.standards.site/headspace/motion): intentional hierarchy, layered atmosphere, and ample time between decorative appearances. Crystal Ball borrows that restraint; its in-app motion targets 60fps rather than the lower frame rates Headspace also uses for narrative work.
- [Duolingo’s art team](https://blog.duolingo.com/shape-language-duolingos-art-style/): a clear shape language and selective animation guide attention. Here the animated hero and Ask sphere identify the central action; supporting decoration stays dim.
- [Apple’s Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/): motion is ongoing behavior coupled to interaction. Fog keeps its time across screens, press response is immediate, and controls remain interruptible.
- [Airbnb’s Lottie project](https://lottie.airbnb.tech/): shared animation tooling helps consistency across platforms. Here a small shared token set and equivalent GPU/native primitives suffice without adding an animation runtime.

Performance evidence belongs in `docs/evidence/motion-2026-09-30/`. Measure each named interaction at 390×844, including actual canvas draws rather than only rAF callbacks. A native bundle proves compilation, not native device frame rate; report that boundary explicitly.
