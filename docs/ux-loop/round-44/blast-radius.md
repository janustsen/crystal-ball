# Shared-surface blast radius

The change replaces the common orb renderer, room atmosphere, text fonts and panel/action surfaces. It also places inputs over parchment and changes History from rows to labeled jars. Data formats, provider decoders, billing and stored readings are unchanged.

The main safety fact is that decorative layers do not own input or reading state: Paper and PaperButton forward the original props/handlers, PaperArt ignores pointer input, TextInput still receives its original ref/value/change callbacks, and the room is aria-hidden and pointer-inert. The live page, not those statements alone, supplies the proof:

- `scripts/check-expanded-input.mjs`: 24 current-field combinations pass full draft retention, cancellation, Done, focus restoration and no implicit engine request at 360/390/430, both scales and two heights. `input-fixed/checks.json`.
- `scripts/check-answer-keyboard.mjs`: two text scales pass Space/arrows/Home/End, roving Tab order, explicit commit, previous-choice restoration and zero axe violations. `keyboard/`.
- `scripts/drive-design.mjs` and the memory/recovery drives: real Ollama data flow, saved outcomes, exported image, reset, cancellation and timeout remain correct. `live-fixed/`, `memory-final/`, `recovery/`.
- `scripts/check-motion-accessibility.mjs`: both reduced-motion preferences stop painted smoke and CSS motion; large-text orbs and the input choice remain available. `motion/`.

Confirmed issues fixed: image intrinsic sizing escaped the surface; dark painted shading hurt contrast; caller padding placed omen text on a frame; CSS border-image needed a matching fallback writing color. Failed observations remain in this round’s evidence and transcript. The stale school test and two stale browser-driver assumptions were updated to traverse the real current UI while preserving their state/privacy assertions.

Physical iPhone Dynamic Type, keyboard, VoiceOver and device frame rate remain unproven. A native bundle is not proof of those properties. Separate painted wall/shelf/hearth layers are still missing, as listed in the asset inventory. No semantic or predictive-accuracy claim follows from these structural/interaction passes.
