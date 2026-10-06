# Plus Inner Library and ball styles (2026-10-06)

Web preview on an owned port with `EXPO_PUBLIC_ROOM_ASSET_BASE=/room`, headless Chrome at 390×844, `scripts/drive-plus-styles.mjs` (all assertions passed, no console errors; transcript in `drive-plus-styles.json`). Plus is the preview's simulated purchase.

- `balls-render-rest-spun.jpg`: row 1 the local-AI renders (smoke, aurora, obsidian, gold-flecked); row 2 the live ball at Ask, unturned; row 3 the same ball after a drag spin; Classic on the right of rows 2-3. Rest matches the render; a spin turns the interior while the render's glints stay with the light.
- `library-locked.jpg`: Free sees the door upsell over the You spot; the chamber is not shown.
- `library-pushin.jpg`, `library-open.jpg`: Home's entry plays the approved push-in (bytes match `home-library.mp4`) and rests on the chamber still, with no live ball.
- `library-picker.jpg`: ball choices preview each render on its stand; Aurora selected.
- `share-aurora.jpg`: the share card's ball is the chosen style's render (a seeded saved reading, not a model pass).

Also passed on the same build: `scripts/drive-room.mjs` (tabs, 25 prefetched clips, reduced-motion fade, golden halo) and its 20-pair flight harness, `scripts/verify-social-db.sh` (new ball-style constraint on PostgreSQL 17), `npm run check`, `npm test`. Not verified: native (no Xcode); the native room shows the style render over the static orb.
