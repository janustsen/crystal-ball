# Room integration evidence (2026-10-06)

Web preview on owned ports (Expo :8098, engine :8798, local Ollama qwen3:4b), headless Chrome at 390×844, streamed clips served from `public/room` with `EXPO_PUBLIC_ROOM_ASSET_BASE=/room`.

- `scripts/drive-room.mjs` (`drive-room.json`, screenshots): Home rests on its bundled loop; all 24 streamed clips prefetch; Home→Sky→History→You→Home each play their flight and land on one loop; Home→Ask flies to the close-up and the live ball sits on the ring under `ask-ball` (within the loops' few-pixel camera drift); a seeded golden reading rings the Ask ball with the gold halo; reduced motion plays no flight or loop and fades between stills. No console errors.
- `scripts/drive-home-spin.mjs`: drag spins without opening a reading or scrolling (mouse, touch, cancelled touch), tap reads, reduced motion draws only while dragged.
- `scripts/check-layout.mjs` (`layout.txt`): 144/144 states without horizontal overflow at 360/390/430 px, normal and 200% text. One earlier run flagged Share at 360 px mid-entrance; the next three runs were clean.
- `scripts/check-motion-accessibility.mjs`: OS and in-app reduced motion stop drawing and animations, resume, large text and immediate listening (3 consecutive passes after landing flights when reduced motion turns on).
- `scripts/drive-design.mjs` (`drive-design.json`): real Ollama reading flow, share/export, history, plans, Sky and the five tabs at 375×667 with 200% text and reduced motion, axe scans clean. Run before the final reduced-motion landing fix, which only touches a mid-flight reduced-motion toggle.

Found and fixed during this pass: removing the fog backdrop had dropped the shell's shared stylesheet (entrances, reduced-motion rule, focus rings); the reduced-motion fade then stalled under that rule and now runs on the Web Animations API.

Not verified: native (no Xcode; native shows stills, follow-up `cb-native-room-video`), real-device video decode and frame rate (headless Chrome decodes in software), Safari/iOS playback, hosted CDN/Supabase Storage delivery and CORS (credential step, see SETUP.md).
