# Chip selection fade

Captured on the iPhone 18 Pro simulator (iOS 27.0) from a Release build of the combined branch fm/cb-ux-feedback (79bcc383), driven by a throwaway XCUITest flow that taps and types like a person (birthday typed one digit at a time). The combined build carries every UI-feedback change, so headings show IM Fell English even where this piece does not change fonts. Simulator captures are not physical-device proof.

- `09-chip-chosen.jpg`: the chip settled in its selected state.

An earlier `08-chip-fading.jpg` was meant to catch the fill mid-fade, but the simulator screenshot landed after the 260 ms fade and matched `09` byte for byte, so it was removed. The fade itself is sampled frame by frame in the browser by `scripts/drive-first-run.mjs` (it requires partial-opacity frames before the fill settles at 1); that is web proof, not native.
