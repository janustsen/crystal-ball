# About you (formerly The Ball asks)

## Sub-features
A finite bank of one-tap questions about yourself (adult and teen decks in `src/ball-asks.ts`), skip, change and forget answers, a free AI insight every 10 answers (engine `insight` action), one bonus reading per 25 distinct answers, theme-relevant answers on readings and the reveal's "Shaped by your answer" chip.

## How to get to it (user POV)
You › About you (from 3 questions for every account). Tapping a reveal's Shaped by chip opens it once that same threshold is reached.

## Driving it
`VERIFY_URL=http://localhost:8087 npx tsx scripts/drive-ball-asks.mjs` (tsx, because it imports the bank). It onboards fresh adult and teen profiles, answers through two live insights and the 25-answer bonus (Plans pill shows 2 readings), changes and forgets answers, then asks a personal reading and asserts 1–6 self answers travel with it; the chip is asserted whenever the model names one. Screenshots and the request log go to `EVIDENCE_DIR`. The bonus's server path is proved against real PostgreSQL in `tests/dev-transport.test.ts`; `tests/ball-asks.test.ts` covers the bank, deck rules, engine context and insight validation.

## Gotchas
Answers are `self_*` facts; the engine accepts only a bank option, so no free text reaches a prompt. See [README](../../../../../README.md) for distinct-question rewards, daily Today progress and Forget everything behavior. Copy says "more personal", never "more accurate".
