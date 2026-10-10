# The Ball asks: evidence (2026-10-09)

`ios-*`: iOS 27 Simulator (iPhone 17), a Debug dev client loading this branch from Metro, with the local engine and Ollama `qwen3:4b-instruct-2507`. Driven through Metro's Hermes inspector by invoking each element's real `onPress`. Both insights at 10 and 20 answers, the 25-answer bonus (2 readings left), and the reveal's "Shaped by your answer" chip are live model output, not fixtures. The chip opens The Ball asks.

`web-*`: `scripts/drive-ball-asks.mjs` in the web preview, also live. It covers the teen deck (no adult-only questions in 9 answers) and changing and forgetting answers.

Not shown: real-phone delivery and VoiceOver. The bonus's server ledger is proved against PostgreSQL in `tests/dev-transport.test.ts`, not shown here. These shots prove behavior and layout, not predictive accuracy.
