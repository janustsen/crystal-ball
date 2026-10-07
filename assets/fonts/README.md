The app loads one typeface for all UI text: Cormorant Garamond (regular and italic; `app/_layout.tsx`, `fonts` in `src/ui.tsx`). The other faces remain only for scripts and generated design CSS that still name them.

IM Fell English (regular and italic) and Hanken Grotesk match the supplied Crystal Ball design. Latin WOFF2 files were extracted from that export. Native TTF files and their OFL licenses come from the corresponding `ofl/imfellenglish` and `ofl/hankengrotesk` directories in [google/fonts](https://github.com/google/fonts). No runtime font network requests are required.

Home ports the Claude Design canvas Library artboard, which uses Cormorant Garamond 500 (regular and italic) and Instrument Sans 500 from Google Fonts. Their Latin WOFF2 and static TTF files are the ones Google Fonts serves for that artboard's `css2` request; OFL licenses come from `ofl/cormorantgaramond` and `ofl/instrumentsans` in google/fonts.
