# Crystal Ball motion language

The ball is a small atmosphere behind glass, drawn like a premium illustrated game: inked silhouettes, brass rims, candle bounce light and hard drop shadows give every surface a front, a side and a floor. Motion has two materials. **Smoke** is soft, continuous and never stops. **Brass** is solid: it squashes when touched, overshoots once when it lands and settles. The sphere remains the visual anchor; text is readable and controls respond immediately throughout motion.

| Signature | Where | Timing and behavior |
|---|---|---|
| Living mist | Hero and Ask orb, listening, thinking | Cel-shaded smoke over dark glass: three soft-edged tone bands, one inked contour, lit from below. A doubly domain-warped field advects upward about three times faster than the first release; fog time runs 1.5× while listening and 1.9× while thinking, integrated so speed changes never jump. No rotation or time reset. Native uses three seamless translucent fields driven off the JS thread. |
| Levitate | Every web orb | The glass floats 2.2% of its size above the stand on a 6.1s (tab orb 4.7s) sine; its floor shadow narrows and fades as it rises. |
| Gold breath | Orb halos | A quiet 7.3-second light swell. Opacity and scale only. |
| Squash and spark | Every tappable | 420ms squash (1.07×0.86), stretch (0.95×1.07), settle. The ball itself uses a 620ms jelly. Seven brass four-point sparks and a ring leave the touch point over 560ms. Buttons also sink 3px onto their brass lip while held. |
| Smoke wipe | Tabs, paywall, ordinary screens | 700ms. A dark smoke curtain with cream leading wisps sweeps left to right while the new screen slides in 22px with a 5° skew. |
| Orb portal | Ball tap / Ask | 1,000ms. The listening screen opens from a circle at the orb, scaling from 60%, while a gold ring blooms outward. |
| Ripple in | Listening | 760ms scale-in from 94% with one fine ring from the orb. |
| Ink settle | Typing | 560ms spring rise through 18px with a 2.5° skew that straightens like wet ink. |
| Card flip | Follow-up questions | 780ms spring flip through 62° around the vertical axis, alternating direction per question, through a puff of mist. |
| Inhale | Thinking | 900ms. The screen arrives from 112% with a slight counter-turn while the mist gathers inward. |
| Glimpse burst | Prediction | 1,000ms. Content pops from 55% with one squash, one stretch and a settle; a thick gold shockwave leaves the orb. Headline text follows 200ms later. |
| Card deal | Share | 720ms spring. The story card is dealt up from 80px, rotated 8°, landing square. No scale or veil: the share preview is a large image layer, and a scale change re-rasterizes it on landing. |
| Sky depth | Background | Two seamless star tiles drift at different speeds (140s and 90s per tile, the near one twinkling), the sky sways on a 23s breath, and pointer position shifts sky, candle and embers by different amounts for parallax. Rare gold streak, passing crescent and faint constellation remain the easter eggs. |

`src/motion.ts` owns transition names, durations and two curves: ease cubic-bezier(.2,.75,.2,1) for smoke and glass, spring cubic-bezier(.34,1.56,.64,1) for brass and cards. `src/motionCss.ts` owns the web keyframes and the illustrated depth layer. Native `Enter` uses the same durations and curves through the native driver, including the question flip; native taps keep the button lip press and orb scale. Web uses compositor transforms and opacity; the orb portal additionally animates a clip-path for one second. Constant fog advection uses continuous time rather than easing to a stop.

Ambient rules: no sprite-frame playback, rotating noise plate, visible wrap, time reversal, or countdown. Star tiles translate by exactly one tile period, so their loop has no visible seam. The web renderer survives mood changes; [motion lifecycle](motion.md) defines its display cadence and pause behavior. Native seamless tile endpoints contain the same pixels; differently sized layers and nonmatching periods conceal any combined pose. Escaping native wisps wrap only while fully transparent. Sky discoveries also reset only while invisible. Reduced motion shows a still, readable composition, hides sky visitors, transition veils and tap sparks, and skips squash. Changing that preference must stop motion immediately.

## Reference lessons (bounded review, 2026-09-30)

- [Headspace’s motion guidelines](https://live.standards.site/headspace/motion): intentional hierarchy, layered atmosphere, and ample time between decorative appearances. Crystal Ball borrows that restraint; its in-app motion targets 60fps rather than the lower frame rates Headspace also uses for narrative work.
- [Duolingo’s art team](https://blog.duolingo.com/shape-language-duolingos-art-style/): a clear shape language and selective animation guide attention. Here the animated hero and Ask sphere identify the central action; supporting decoration stays dim.
- [Apple’s Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/): motion is ongoing behavior coupled to interaction. Fog keeps its time across screens, press response is immediate, and controls remain interruptible.
- [Airbnb’s Lottie project](https://lottie.airbnb.tech/): shared animation tooling helps consistency across platforms. Here a small shared token set and equivalent GPU/native primitives suffice without adding an animation runtime.

Performance evidence belongs in `docs/evidence/motion-2026-09-30/` (art pass: `docs/evidence/art-pass-2026-10-01/`). Measure each named interaction at 390×844, including actual canvas draws rather than only rAF callbacks. A native bundle proves compilation, not native device frame rate; report that boundary explicitly.
