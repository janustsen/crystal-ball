# Painted asset pipeline

The witch's-house world (see [design thesis](../design-thesis.md)) uses painted raster art, not clean vector shapes. The planned pieces are separate layers for smoke, glass highlights, candlelight and reveal shards. This document describes the generation plan; [current assets and missing layers](apothecary-assets.md) owns what is actually available and used.

## Style sheet (prefixed to every prompt)

> Hand-painted storybook illustration, gouache and ink with fine engraved line detail, slightly exaggerated cartoon proportions with rich volumetric depth, aged and worn materials, intricate hand-carved ornament, visible brush texture, warm amber candlelight from the left, deep umber and plum shadows, muted gold highlights. No text, no letters, no watermark, no logo, no border. Single isolated object, centred, fully in frame.

Prompts never name artists, studios, games or copyrighted characters.

## Background conventions

| Layer kind | Generated on | Processing | Blend in app |
|---|---|---|---|
| Light (smoke, glints, flame, burst) | pure black #000000 | luminance → alpha | screen / additive |
| Solid object (stand, jars, frames, charms) | flat chroma magenta #FF00FF | chroma key, 1px edge defringe | normal |
| Full backdrop (wall, table) | painted to edges | crop to 9:19.5 | normal |

`docs/ux-loop/witch-thesis/generate-art.mjs` calls the Gemini image model, saves the raw response and keyed transparent WebP at 1x/2x/3x into `public/concepts/witch-assets/art/`, and appends provenance to `docs/art/provenance.json` (model, prompt, date, seed attempt, output hash). It reads `GEMINI_API_KEY` from `~/.config/gemini/env` without printing it. The key is never committed.

## Asset list

Shared across all concepts:

- `ball-interior`: the dark inside of an empty glass sphere: deep smoky amber depth, a faint nebula, no highlights. Solid.
- `ball-smoke-a`, `ball-smoke-b`, `ball-smoke-c`: curling wisps of luminous golden smoke. Light layers, animated inside the sphere mask.
- `ball-glass`: specular window highlights, a crescent rim light and fine surface scratches on an otherwise empty glass sphere. Light layer.
- `reveal-shards`: glass fragments and sparks bursting outward. Light layer.
- `reveal-glow`: a soft golden bloom with rays. Light layer.
- `candle-body`: a short, thick beeswax candle with long wax drips on a small iron dish. Solid.
- `candle-flame`: a single candle flame with a blue base. Light layer.
- `question-slip`: a small torn parchment slip tied with twine, blank. Solid. The question is lettered onto it in the display face, with a slight rotation and an ink-bleed filter.

Per concept:

| Asset | A · Carved wood | B · Apothecary | C · Storybook cottage |
|---|---|---|---|
| `stand` | Dark walnut stand carved with moons, vines and owl claw feet | Brass and glass apothecary stand with etched rings and a small label plate | Chunky painted wooden stand with toadstools and moss, cartoon proportions |
| `backdrop` | Candlelit plank wall with carved shelves in deep shadow | Floor-to-ceiling apothecary shelves of bottles in soft focus | Cosy cottage interior at night: round window, hearth glow, hanging herbs |
| `table` | Thick worn tabletop edge with wax drips and knife marks | Marble-topped counter with brass trim | Rounded painted table with a lace cloth edge |
| `panel` | Chipped carved wood plaque, blank | Parchment label with brass corners, blank | Painted wooden sign with rope, blank |
| `price-tag` | Brass medallion, blank | Paper tag on string, blank | Wooden heart tag, blank |
| `history-jar` | Glass jar with a cork and a curl of smoke | Labelled apothecary bottle, blank label | Round glass jar with a ribbon and a firefly |
| `charm-work` / `-love` / `-learning` / `-fresh` | Carved token: quill and key / two candles / open spellbook / sprouting seed | Bottles holding the same symbols | Painted icons of the same symbols |

Sizes: backdrops 1290×2796 (3x of 430×932), the stand and ball layers 3x of a 261 px orb (783 px), charms and jars 3x of 96 px. WebP quality 82. Total first-load art budget for Home is ≤ 700 KB.

## Interactivity

- The ball is stacked as interior → smoke a/b/c (screen blend, drifting transforms masked to the sphere) → glass highlights → stand.
- Candle flicker changes the flame's opacity and scale and a warm overlay on the backdrop. It is disabled with Reduce motion.
- The reveal opens like a treasure chest: anticipation wobble → crack → shards and glow burst → the headline resolves on parchment.
- The question never sits flat on the glass. It appears on the parchment slip tied to the stand, or as smoke lettering inside the ball, with blur and depth.

## Provenance

Every generated file is listed in `docs/art/provenance.json`. Hand edits (crop, key, defringe) are recorded as processing steps. Generated art is reviewed before use, so no recognisable third-party characters, marks or styles ship.

## Authorized Gemini browser concept pass (2026-10-04)

The concept pass uses the captain-authorized Temporary chat on the MacBook through `/tmp/cb-gjs.sh`, confined to its existing window. The one-off browser helper submitted the same prompt table and retrieved generated blob images through a canvas. Browser authorization was then revoked in inbox 020; the driver was stopped and removed. It must not be rerun. It does not read other chats or automate another browser window. `generate-art.mjs --prompts` prints the prompt table; `--import <names>` processes locally retrieved PNGs without an API key. The UI shows Pro, but does not expose the image model; provenance therefore records **Gemini web, undisclosed image model**, not an assumed Nano Banana version.

The retrieved preview images are typically 1024 pixels on their longest edge. Responsive WebP variants never upscale them; `@3x` is the variant name, not a claim of native 3× resolution. Production art resolution, alpha edges and motion need another review after the direction is selected. Concept generation intentionally covers the ball, stands, backdrops, panels and memory jars first. Dedicated charms, tags and reveal effects are still pending and are identified in the study.
