# Bond reading

## Sub-features
A reading about you and one person by first name: a named bond (src/bond.ts, stable for the same two people), a compatibility percentage (64–98, about the shared bond, never the other person's feelings) and one shared forecast with a due date (server/bond.ts). With an opted-in Circle friend it goes deeper: their sun sign and shared themes shape the bond and forecast (Plus, same gate as Friend readings). The reveal shows two glass balls side by side with the percentage between them; the story card paints two balls.

## How to get to it (user POV)
Home → Bond reading, or Ask → Bond reading chip; the first name is written into the ball, then Read our bond. Circle friend: Sky → Circles → an opted-in friend → first name → Read our bond.

## Driving it
`VERIFY_URL=http://localhost:<web-port> EVIDENCE=<owned dir> node scripts/drive-bond.mjs` against the live Ollama engine: entry, first-name validation, thinking copy, reveal (bond name, percentage, `You and <name> will … within N months.`, due date), Why, two-ball 1080×1920 PNG, a second reading of the same name giving the same bond and percentage, History persistence and 375 px large text with no horizontal overflow. `tests/bond.test.ts` covers the model, the feelings tripwire's repair-then-fail-closed, the engine's first-name gate and the Circle-friend path with fake Supabase.

## Gotchas
A bond costs one reading. Web-trial visitors get the install message instead. The Circle-friend path needs the social stack (see SKILL.md's isolated social verification); its unit test fakes Supabase. The percentage is entertainment and never an accuracy or feelings score.
