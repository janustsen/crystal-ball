# Daily ritual and notifications

| Feature | Source | Drive | Boundary |
|---|---|---|---|
| Today card steps (omen, three Ball asks answers, ask or check in), star per finished day, constellations | `src/ritual.ts`, `src/DailyRitual.tsx`, Home `today` slot | `node scripts/drive-ritual.mjs` (`VERIFY_URL`, `EVIDENCE_DIR`) | Real local engine and model; one day only (day rollover is unit-tested in `tests/ritual.test.ts`). |
| Notification offer after the first forecast, day-3 re-offer, You settings | `offerNotifications`, `NotifyOffer`, `NotifySettings` | Same driver (web saves the choice only) | The iOS permission prompt and delivery need the Simulator. |
| Planner: ≤2 a day across replans, 8am–9pm, grouped check-ins, priorities, back-off | `planNotifications`, `registerNotifications` | `tests/ritual.test.ts` | Due reservations consume the persisted daily budget, including after restart or dismissal. Back-off uses unopened days inferred from the plan. |
| Private counts and planned list | `RitualDebug` (long press You's entertainment line) | Same driver | On-device only. |
| Local scheduling and taps | `src/notify.ts` | Simulator: Release build, allow notifications, Send a test notification in the counts panel | Not a physical-phone proof. |
| Server push to the app | `pushMessage`/`apnsPayload` in `server/social-push.ts`, `scripts/simulator-push.mts` | `npx tsx scripts/simulator-push.mts <udid> sky seal` | Proves payload, delivery and tap routing, not APNs credentials or token registration. |
