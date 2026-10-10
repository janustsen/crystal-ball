# Daily ritual and notifications evidence (2026-10-09)

Web (`node scripts/drive-ritual.mjs`, 390×844, real local engine and Qwen): `web-home-today.png` (omen step done, 1 of 2), `web-home-star.png` (2 of 2, star in Ursa Major), `web-you-sky.png`, `web-you-counts.png` (private counts, long press on You's footer).

iOS Simulator (`scripts/ios-ui-test/run.sh`, XCUITest against a simulator build loading this branch from Metro, real local engine): the notification offer after the first forecast, the iOS prompt that only Yes triggers, You's notification switch, a local ritual notification on the home screen, a server push delivered by `scripts/simulator-push.mts` (`ios-push.log` is its payload) and the push tap opening Sky. The test passed (`** TEST SUCCEEDED **`, 1 test, about 4 minutes).

Boundaries: Simulator delivery bypasses APNs; it proves payload, delivery to the app and tap routing, not APNs credentials or token registration, which need the paid Apple account and an EAS project ID. Nothing here measures whether anyone comes back.
