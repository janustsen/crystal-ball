# Question ladder

## Sub-features
New accounts start with the ball alone; features open by questions asked (`src/ladder.ts`): History 1, About you 3, Daily insight 5, Bond reading 8, Tonight’s Sky 12, Inner Library 20. Each opening shows a one-time “New: … it does X” notice on the reveal, then a dot (on its tab, row, insight line or Sky line) until first opened. Home’s next-step card picks one of: newly opened (off Home), check-in due, next free question tomorrow, last starter questions, or what the next questions open. The pill reads “N free questions” during the starter, “N free today” after, “N questions left” with packs, and Plus. Plus and Year ahead accounts see everything without dots; `ladder.asked` survives Forget everything.

The server side is the free starter (`supabase/migrations/202610160010_starter_questions.sql`): the first 20 charged readings ever are free, then 1 a day; see [billing](../../../../docs/launch/billing.md) for the off switch.

## How to get to it (user POV)
A fresh profile, then ask. To see a later rung without asking 20 questions, seed `crystal-ball-v1` with `ladder:{asked:N,opened:[…]}` and matching history.

## Driving it
`PREVIEW_URL=<owned preview> LADDER_EVIDENCE=<dir> node scripts/drive-ladder.mjs`: onboarding and one real reading against local Ollama (0 → 1, the History notice and dot), then seeded accounts at 3, 5, 8, 12 and 20 questions and day 2 after the free 20, and an account stored without ladder state (it starts on the ladder, counted from its saved readings), with Home/You/Sky/Plans screenshots. `tests/ladder.test.ts` covers thresholds, dots, the next step and the device starter; `bash scripts/verify-social-db.sh` covers the SQL starter and its off switch.

## Gotchas
The local preview without Supabase counts the starter on the device; server-metered builds take `starter` from the balance (older servers omit it and keep 1 a day). Many older drivers still navigate by the removed Sky/Ask tabs, `today-card` on Home or the tour; they need the ladder seeded (an account stored without one starts on the ladder), and are listed as stale in the PR that introduced the ladder.
