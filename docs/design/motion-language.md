# Crystal Ball motion language

The ball is a small atmosphere behind glass. The [UI rules](ui-rules.md#palette-and-composition) own the surfaces. The [room](motion.md#room) has its own motion contract; the shared primitives below govern other screens and controls using `src/ui.tsx`. Motion has two materials. **Smoke** is soft, continuous and never stops. **Brass** is solid: it squashes when touched, overshoots once when it lands and settles. The sphere remains the visual anchor; text is readable and controls respond immediately throughout motion.

| Signature | Where | Timing and behavior |
|---|---|---|
| Living mist | Shared orbs, listening, thinking | Cel-shaded smoke over dark glass: three soft-edged tone bands, one inked contour, lit from below. A doubly domain-warped field advects upward about three times faster than the first release; fog time runs 1.5× while listening and 1.9× while thinking, integrated so speed changes never jump. No rotation or time reset. Native uses three seamless translucent fields driven off the JS thread. |
| Levitate | Shared web orbs | The glass floats 2.2% of its size above the stand on a 6.1s (tab orb 4.7s) sine; its floor shadow narrows and fades as it rises. |
| Gold breath | Orb halos | A quiet 7.3-second light swell. Opacity and scale only. |
| Squash and spark | Shared tappable controls | 420ms squash (1.07×0.86), stretch (0.95×1.07), settle. The ball itself uses a 620ms jelly. Seven brass four-point sparks and a ring leave the touch point over 560ms. Pressed buttons dim slightly ([UI rules](ui-rules.md#palette-and-composition)). |
| Smoke wipe | Tabs, paywall, ordinary screens | 700ms. A dark smoke curtain with cream leading wisps sweeps left to right while the new screen slides in 22px with a 5° skew. |
| Orb portal | Ball tap / Ask | 1,000ms. The listening screen opens from a circle at the orb, scaling from 60%, while a gold ring blooms outward. |
| Ripple in | Listening | 760ms scale-in from 94% with one fine ring from the orb. |
| Ink settle | Typing | 560ms spring rise through 18px with a 2.5° skew that straightens like wet ink. |
| Card flip | Follow-up questions | 780ms spring flip through 62° around the vertical axis, alternating direction per question, through a puff of mist. |
| Inhale | Thinking | 900ms. The screen arrives from 112% with a slight counter-turn while the mist gathers inward. |
| Glimpse burst | Prediction | 1,000ms. Content pops from 55% with one squash, one stretch and a settle; a thick gold shockwave leaves the orb. Headline text follows 200ms later. |
| Card deal | Share | 720ms spring. The story card is dealt up from 80px, rotated 8°, landing square. No scale or veil: the share preview is a large image layer, and a scale change re-rasterizes it on landing. |
| Count pop | Readings-left pill | 460ms spring. When the loaded pill label changes, including to or from Plus, the new label rises 10px from 90% with a brief blur on web. First load stays still. |
| Status swap | Thinking status lines | 480ms. Each new status (checking → researching, then “Still working.”) fades up 8px out of a slight blur on web. |
| Notice rise | Notice card | 520ms spring. Each new notice rises 16px from 96% and fades in; no blur, so the glass keeps its backdrop. |
| Success check | Notices for completed actions | 560ms spring. A gold ring-and-tick turns in from −45° and 50% beside the notice (reminder set, purchases restored, purchase complete, card downloaded, fact restored). |
| Refusal shake | Question and “In my own words” fields | 420ms. Pressing the dimmed Ask the Ball (question under four characters) or Continue / Reveal my forecast (empty answer) shakes the field once (8px, decaying). The field stays mounted with its text, and the action stays dimmed and disabled to assistive technology. |
| Sky depth | Background | Two seamless star tiles drift at different speeds (140s and 90s per tile, the near one twinkling), the sky sways on a 23s breath, and pointer position shifts sky, candle and embers by different amounts for parallax. Rare gold streak, passing crescent and faint constellation remain the easter eggs. |

`src/motion.ts` owns transition names, durations, the shake path and two curves: ease cubic-bezier(.2,.75,.2,1) for smoke and glass, spring cubic-bezier(.34,1.56,.64,1) for brass and cards. `src/motionCss.ts` owns the web keyframes and the illustrated depth layer. Native `Enter` uses the same durations and curves through the native driver, including the question flip; native taps keep the shared button press treatment and orb scale. Web uses transforms and opacity, with brief blur filters for count, status and check effects; the orb portal scales a radial iris layer for one second. Constant fog advection uses continuous time rather than easing to a stop.

Ambient rules: no sprite-frame playback, rotating noise plate, visible wrap, time reversal, or countdown. Star tiles translate by exactly one tile period, so their loop has no visible seam. The web renderer survives mood changes; [motion lifecycle](motion.md) defines its display cadence and pause behavior. Native seamless tile endpoints contain the same pixels; differently sized layers and nonmatching periods conceal any combined pose. Escaping native wisps wrap only while fully transparent. Sky discoveries also reset only while invisible. Reduced motion shows a still, readable composition, hides sky visitors, transition veils and tap sparks, and skips squash and the refusal shake; counts, statuses, notices and checks simply appear. Changing that preference must stop motion immediately.

## Reference lessons (bounded review, 2026-09-30)

- [Headspace’s motion guidelines](https://live.standards.site/headspace/motion): intentional hierarchy, layered atmosphere, and ample time between decorative appearances. Crystal Ball borrows that restraint; its in-app motion targets 60fps rather than the lower frame rates Headspace also uses for narrative work.
- [Duolingo’s art team](https://blog.duolingo.com/shape-language-duolingos-art-style/): a clear shape language and selective animation guide attention. Here the animated hero and Ask sphere identify the central action; supporting decoration stays dim.
- [Apple’s Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/): motion is ongoing behavior coupled to interaction. Fog keeps its time across screens, press response is immediate, and controls remain interruptible.
- [Airbnb’s Lottie project](https://lottie.airbnb.tech/): shared animation tooling helps consistency across platforms. Here a small shared token set and equivalent GPU/native primitives suffice without adding an animation runtime.
- [Transitions.dev](https://transitions.dev/library.html) (2026-10-07 library review): the count pop, status swap, notice rise, success check and refusal shake adapt its free number pop-in, text states swap, toast, success check and error shake recipes. They are rebuilt on the shared tokens for web and native rather than installed; the other reviewed kits were web-only React/Tailwind and would split the platforms.

Performance evidence belongs in `docs/evidence/motion-2026-09-30/` (art pass: `docs/evidence/art-pass-2026-10-01/`). Measure each named interaction at 390×844, including actual canvas draws rather than only rAF callbacks. A native bundle proves compilation, not native device frame rate; report that boundary explicitly.
