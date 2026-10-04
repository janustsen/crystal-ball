# Witch's-house comparison

This is a disposable prototype for choosing a material and typography direction. It does not replace the production app or claim that the ongoing 9/10 loop has passed.

Open `/concepts/witch-house.html` on the review preview. Switch among Carved wood, Apothecary and Storybook, then Home, Welcome, Ask, History, Sky & circle and Plans. `?door=b&view=history` deep-links a comparison. The larger-text button applies a 200% type study; it is not native Dynamic Type evidence.

- **A — Carved wood:** intricate cabinet, dark grain and heavy carved plaques; Grenze Gotisch with Alegreya. Most mysterious, but repeated carving can feel dense.
- **B — Apothecary:** jars and light parchment labels; IM Fell English SC with Caudex. Clearest reading surfaces; less enveloping than the cabinet.
- **C — Storybook:** warm cottage, painted signs and softer letterforms; Fondamento with Gentium Book Plus. Most welcoming, with a stronger fairytale character.

All use generated painted raster art, not a reconstructed SVG orb. The question is live text on a separate parchment slip. Text and prices remain HTML. The page offers reduced-motion behavior, keyboard focus, selection state, actual screen navigation, an opening beat, explanatory text and explicit no-purchase feedback. Dedicated onboarding charms remain pending; those controls are labeled as a jar-based material study.

## Reproduce

Browser automation is currently prohibited by inbox 020. Do not rerun the capture driver without renewed authorization. The allowed static check is `node docs/ux-loop/witch-thesis/check-static.mjs`.

Historical capture command, with the existing preview on 8098:

```
node docs/ux-loop/witch-thesis/capture-concepts.mjs
```

The driver uses its own isolated Chrome context. It captures all 18 phone compositions and checks widths 360/390/430 at standard and 200% type, plus Home → Ask, History → Why and plan selection → no-purchase feedback. Evidence lives in `screens/`. These are browser prototype checks, not the 17-screen production gate, iPhone Safari verification, engine proof or purchase verification.

`chrome-devtools-axi` was attempted in its own `cb-witch-concepts` session and returned `No page is currently selected`; the brief explicitly permits isolated Playwright fallback. Its initial default Chromium launch found no bundled browser; the driver now uses installed Chrome, as the existing project drivers do.

First composition observation: the generated stand was too tall and narrow, and the interior had an unwanted engraved rim. The composition was adjusted with a wider stand, layering and a tighter interior crop. Regeneration was cancelled when browser authorization was revoked; original PNGs remain under ignored `.local/witch-art-raw/`. No failed composition is described as a 9/10 result.

## Browser stop and exact evidence boundary

At 2026-10-04T04:47:42Z, inbox 020 revoked browser control. The local generation process was killed immediately after reading the instruction. No further `cb-gjs.sh`, Apple Events, Chrome, or Playwright operations were performed. The Temporary-chat window was left untouched. `c-panel` had been submitted but was not retrieved; no result is assumed. The new browser-generation helper was removed.

Thirteen assets were retrieved: `ball-interior`, `ball-smoke-a`, `ball-glass`, A’s stand/backdrop/panel/jar, B’s stand/backdrop/panel/jar, and C’s stand/backdrop. C uses the original procedural wood texture with chipped CSS edges, and A’s jar explicitly reused. Dedicated charms, C’s own panel and jar, price tags, tables and reveal layers are not generated in this pass.

The six A screenshots and 36 layout cases in `screens/` were captured **before** the stop and final composition adjustments. They passed then, with zero missing images and zero horizontal overflow, plus working question/history/plan controls. They are preliminary evidence only. B/C and the final composition have not been browser-driven or screenshot-verified. A static check verifies local asset paths, script syntax and the live HTTP route.
