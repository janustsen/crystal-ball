# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Run/setup and native integration boundaries: SETUP.md. Theme and interaction authority: docs/design/ui-rules.md.
- Server entry points share server/handler.ts; provider secrets stay server-only. Local Node is loopback development tooling, not a public production API.
- Run npm run check, npm test, and the project verify-crystal-ball skill for UI/service changes. The browser drive uses localhost and an isolated Playwright profile.
- Model-output and decoder constraints: server/provider.ts and docs/evidence/schema-diagnosis.md. Preserve one repair then fail-closed behavior.
- Preserve failed research/grade evidence; never describe a structural pass as a semantic or predictive-accuracy pass.

## Verify one file

- One `.ts` test: `npx tsx --test tests/<name>.test.ts` (e.g. `tests/hosted-limits.test.ts`).
- One `.mjs` test: `node --experimental-vm-modules --experimental-strip-types --test tests/love-notifications.test.mjs`.
- Types are whole-project only: `npm run check`.

## Pattern references

- `tests/bond.test.ts`: small `node:test` + `assert/strict` unit test of a `src/` module.
- `tests/hosted-limits.test.ts`: server test with a synthetic `env` config and no real secrets.
- `server/handler.ts`: shared server entry every runtime routes through.
- `src/bond.ts`: pure client domain module paired with its test.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
