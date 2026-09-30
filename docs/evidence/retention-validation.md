# Retention implementation and verification

Adds an offline curated daily omen on Home, a date-based check-in reminder linked to its reading, and an iOS Daily Omen widget. The existing yes/no/pending verdict remains per reading, visible in History and selected on reopening. No accuracy score or reading allowance change.

## Data and blast radius

`Prediction.checkInOn` is an optional local calendar date (YYYY-MM-DD). Existing stored readings need no migration. The engine still returns the same prediction payload; no provider schema changes. `cloud.ts` mirrors the full prediction JSON, so check-in date and existing verdict travel with that payload without a SQL column change. AccountState and daily-credit logic are untouched. Omen cache uses a separate AsyncStorage key and never invokes the engine or savePrediction.

The safety fact: old readings remain usable and scheduling carries the right reading identity without spending credits. `tests/retention.test.ts` executes the real date helpers and reminder action: legacy reading fallback, month-end clamping, invalid date rejection, stable local-day omen, midnight rollover, date/reading-id forwarding, and web no-schedule behavior pass. Native scheduling itself is a boundary mock, not device proof.

Date defaults recognize explicit durations in the headline; other forecasts retain the existing 30-day fallback. The date is editable before scheduling rather than guessing dates for named events. Notification content asks “Did it come true?” and carries the reading id; a response opens that saved reading. Web only previews the reminder and saves the chosen check-in date.

## Checks so far

- `npm run check`: pass.
- `npm test`: 34 tests, 33 pass, 1 existing ffmpeg-dependent skip.
- `npx expo export --platform web --output-dir .local/retention-web`: pass.
- `npx expo export --platform ios --output-dir .local/retention-ios`: pass.
- `npx expo prebuild --platform ios --no-install`: pass. Generated DailyOmen Swift widget, small/medium families, app group entitlement and extension target observed.
- `scripts/drive-retention.sh`: pass through chrome-devtools-axi, against the real web app with a real local-Qwen reading. See `retention-drive.txt`. Covers unchanged credit balance, daily omen reload, invalid dates, reminder preview, all verdicts, selected state, date/verdict persistence and control bounds.
- Project verify-crystal-ball primary controls driven through chrome-devtools-axi on isolated ports 8094/8794: all five tabs; Spanish question with Other/30 minutes; real model reveal (“You will speak conversational Spanish in 6 months.”); Why and no-source state; History/reload; knowledge edit/forget; sensitive IVF redirect without charging; mock five-pack and Restore; share PNG 1080×1920. Animated export fails visibly with the still-card fallback because local ffmpeg is absent. This is not predictive-accuracy evidence.
- 375×667 with reduced motion and 200% app text: found verdict-row overflow (right edge 397.8px); fixed by stacking choices. Rerun right edge 330px for every check-in control, all five tab labels visible. `retention-large-check-in.png` shows the result; `retention-home.png` shows the omen at normal text size.
- Browser isolation: default ports belong to another lane, so this drive uses copied local server entry in ignored `.local`, APP_ORIGIN localhost:8094, engine 8794, and a worktree-local TMPDIR for Metro. A shared Metro cache initially supplied another lane's engine URL; isolating TMPDIR resolved it. No other lane's processes were stopped.
- Formal full verify-crystal-ball merge gate still belongs on the final merge head after the pending redesign lands; this is the implementation handoff's targeted and primary-flow proof.

## Native limits and follow-up

Uses the official `expo-widgets` config plugin and `@expo/ui` SwiftUI views, with a static gradient ball. [Expo widget documentation](https://docs.expo.dev/versions/latest/sdk/widgets/) requires a development build; Expo Go/web/Android keep Home's omen. No native orb internals changed.

A year of local-midnight timeline entries is refreshed when Home opens; beyond that window the widget requires opening Home again. OS scheduling can delay widget refresh. Time-zone changes are reflected when Home refreshes its timeline when Home next refreshes. Xcode signing/build, physical widget rendering, notification permissions/delivery, and cold/warm notification-tap navigation are unverified on device and must be driven after Xcode setup. No account, paid service, or credential is added.
