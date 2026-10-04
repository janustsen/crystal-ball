# Reveal videos

`render.mjs` films short vertical videos (1080×1920, 30 fps, H.264, no audio) from the real web app and the live engine, then burns in the hook text and a visible **AI-generated** label for A/C or **AI-generated demo** for B. Videos are output only; never commit them.

| Format | What it films | Length |
| --- | --- | --- |
| A · sealed-forecast reveal | Home → tap the Ask ball → type the hook's question → real follow-up cards → reveal with due date. Model thinking time is cut. The hook shows until the reveal. | 10–15 s (enforced) |
| B · example check-in | A real reading made off camera, then the app reopened with its clock fixed to noon on the due date solely to reach the check-in screen: Home → History → the reading → a demo Yes / Not quite / Not yet. Caption: `How a check-in works`. The `AI-generated demo` label stays on screen throughout. | ~8 s |
| C · daily-omen slideshow | Live engine omens for six signs (Aries–Virgo or Libra–Pisces) over the app's own background art, then the real Home with today's omen. Faceless. | 8 slides, ~22 s |

## Render a day's batch

Prerequisites: `ffmpeg` (with the `libx264` encoder) and `ffprobe` on PATH, plus Google Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, which the renderer currently uses directly.

1. Start the engine and preview using the [verification launch instructions](../../.agents/skills/verify-crystal-ball/SKILL.md#launch), with Ollama serving. Preview authentication follows [local setup](../../SETUP.md#local-development).
2. Run:

   ```sh
   VERIFY_URL=http://localhost:8087 node scripts/content/render.mjs --day 2026-10-05 --a 2 --b 1 --c 2
   ```

   `--a/--b/--c` are per-format counts. `--day` selects the output folder and offsets the A/B question lists by their batch counts; a count equal to a list's length repeats that list each day. It does not change the date used for live readings or omens. C alternates the two sign groups within each batch. `--out` (or `CONTENT_OUT`) sets the output root, default `.local/content` (gitignored). The full bank goes outside git: `--a 12 --b 10 --c 8 --out /Users/janustsen/dev/archive/crystal-ball-content`.
3. Read `<out>/<day>/manifest.json`. It lists each video's hook, question, the model's headline and due date, the B demo outcome and label, and the C omens. Use it for captions; preserve B’s example framing and `AI-generated demo` disclosure. Per-video failures are listed with their error (including the screen text when a reading stalls), and the command exits non-zero. Startup failures appear in the command output and may leave no manifest. Re-run the batch for that day. The engine fails closed on some questions, so the driver uses the app's own Try again up to twice.

A full run takes about a minute per video.

Run `node --test scripts/content/verify-capture.mjs` separately on the renderer’s Mac with project dependencies installed. This browser check exercises the capture guards against fixture omens and follow-up cards, including an omen refresh. It uses the same Chrome prerequisite as rendering and is outside the browser-free `npm test` suite; it does not replace a live-app render.

## Content rules

Every hook comes from `hooks.mjs`, and `assertSafe` checks every caption and omen at render time (`tests/content-hooks.test.ts` covers the list):

- Hooks name a category, never a real person. Mid-sentence capitalized words must be on the allowlist.
- No minors, school or teen framing. Readings use an adult profile (`profileBirthday`).
- No accuracy claims, soulmate drawings, "reveal who" mechanics, psychic personas or ratings for rewards.
- No faces, fake reactions or invented users. B outcomes cycle across Yes / Not quite / Not yet by day and position in the batch, independently of the question. Every B video is labeled `AI-generated demo` and captioned `How a check-in works`; these demonstrate the controls, not observed results or personal testimonials.

Before adding a question, run it through the live engine once. Small local models reject some phrasings, such as "inbox to zero".

## Boundaries

- Drive through stable testIDs (`tab-*`, `type-instead`, `question-input`, `option-0`, `record-reveal`, `check-in-*`, `daily-omen`), Action labels (`continue`, `meet-the-ball`, `try-again`) and the History row's question text. After a UI change, render a small batch and check each format before rendering the bank.
- Format C requires the `.atmosphere` art layer and fails with an explicit error if it is absent. Background capture hides everything else in the app shell.
- Capture uses a CDP screencast at device pixels. Playwright's `recordVideo` would upscale a 360×640 capture.
- Local engine only. The renderer refuses a hosted provider, because hosted inference requires the viewer's own in-app AI consent.
- Model headlines and omens pass the same content rules as hooks. A video that fails any check is deleted and listed under `failures`.
