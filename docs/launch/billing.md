# Billing and App Store build

Real purchases go through RevenueCat (`react-native-purchases`) on iOS. The server ledger in Supabase is the only source of truth for Plus and reading packs; the app never grants itself an entitlement.

## How it works

| Piece | Where | What it does |
|---|---|---|
| Catalog | `src/billing.ts` | Product ids, decided prices (weekly $1.99 preselected, monthly $5.99, yearly $39.99; 5 readings $1.99, 20 readings $5.99), weekly-only 3-day trial. |
| Ledger | `supabase/migrations/202610040050_billing.sql` | `social_profiles.plus_until` and `packs`, `pack_purchases` (one pack grant per store transaction) and `reading_charges` (one charge per reading id). Free: 1 reading per UTC day; Plus: 10; packs cover the rest and never expire. Clients can read their own row and nothing else. |
| Metering | `server/handler.ts`, `server/social.ts` | Personal and friend readings check the balance before inference and charge after a successful forecast. Failed or blocked generation adds no charge; client interruption follows the [retry guidance](../../README.md). Each ask (client key plus question, answers and subject) is charged once, one retry of it is free, and every later reuse is charged again. |
| Circle forecasts | `publish_circle_forecast` | Publication charges the asker one reading in the same transaction; no reading, no publication. |
| Reconcile | `server/billing.ts` | Reads the RevenueCat subscriber (`GET /v1/subscribers/{id}`) and applies it: Plus expiry from entitlement `plus`, one pack grant per transaction. The response's `request_date` orders snapshots (`store_synced_at`), so a delayed stale snapshot cannot replace a newer expiry. |
| Styles | `supabase/migrations/202610060060_plus_styles.sql`, `supabase/migrations/202610070010_ball_styles.sql`, `server/billing.ts` | `social_profiles.ball_style`/`card_style`, written only by the `styles` billing action through `set_profile_styles`, which refuses non-Classic styles without active Plus. A lapsed subscription keeps the saved choice; the app renders Classic until Plus returns. |
| Webhook | `supabase/functions/revenuecat` | RevenueCat calls it on every event; it reconciles every Supabase user on the event (including transfers). |
| App | `src/purchases.ts`, `app/index.tsx` | Configures RevenueCat with the Supabase user id as app user id, shows store prices and trial eligibility, buys, restores, links to Apple's subscription management, then asks the server to reconcile and shows the server balance. |

Modes (`EXPO_PUBLIC_REVENUECAT_MODE`):

- `store`: real App Store purchases. Sandbox on development and TestFlight builds, production in the App Store. Every EAS profile sets this.
- `mock` (default for the preview): labeled test purchases. With local Supabase and `SOCIAL_MOCK_ENTITLEMENTS=true` they still go through the real ledger (`/billing` `simulate`, refused for non-loopback Supabase). Without Supabase the preview counts on-device only.

Web in `store` mode shows the plans with “Purchases are available in the Crystal Ball iOS app.” and disabled purchase buttons.

An engine without `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` refuses signed-in readings (503) rather than serving them unmetered. Any engine real users reach must have both.

Balance snapshots carry their owner and database-clock `asOf`. The app queues application with archive work and accepts only newer snapshots for the current owner; changing owner resets snapshot freshness and reloads that owner’s balance (`src/store.tsx`). Each accepted snapshot also anchors two estimates of the server clock: a wall-clock offset, which survives device sleep, and a monotonic one, which survives a later phone clock change. The minute timer requests a fresh balance when either estimate passes the server's UTC midnight, including when the phone clock is behind or corrected; it never resets server-metered usage locally. Plans refresh store offers and trial eligibility on opening and after purchase, restore or account changes.

## One-time setup (needs Janus's accounts)

Nothing below can be done without the accounts; everything else is in the repository.

1. **Apple Developer Program** membership for the team that owns `com.janustsen.crystalball`. Accept the Paid Apps agreement and complete banking and tax in App Store Connect; purchases fail without it.
2. **App Store Connect**: create the app with bundle id `com.janustsen.crystalball`, then:
   - Subscription group “Crystal Ball Plus” with `cb_plus_weekly` ($1.99/week, introductory offer: 3-day free trial, new subscribers), `cb_plus_monthly` ($5.99/month), `cb_plus_yearly` ($39.99/year).
   - Consumables `cb_pack_5` ($1.99) and `cb_pack_20` ($5.99).
   - An In-App Purchase key (Users and Access › Integrations) for RevenueCat, and a Sandbox tester account.
3. **RevenueCat**: create the project and iOS app (bundle id above), upload the In-App Purchase key, import the five products, create entitlement `plus` attached to the three subscriptions, and a current offering containing all five products. Add a webhook pointing at `https://<project-ref>.supabase.co/functions/v1/revenuecat` with an Authorization header value you choose.
4. **Supabase (hosted)**: apply `supabase/migrations`, enable anonymous sign-ins, then set function secrets `REVENUECAT_SECRET_KEY` and `REVENUECAT_WEBHOOK_AUTH` (`supabase secrets set ...`) and deploy `supabase functions deploy revenuecat`. Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into functions.
5. **Engine**: the engine serving readings needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `REVENUECAT_SECRET_KEY` (sync after purchase and restore) in its server environment.
6. **Expo / EAS**: `eas login`, `eas init` (writes `extra.eas.projectId` into app.json), then set EAS environment variables for each environment: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ENGINE_URL` and, for shared seals, `EXPO_PUBLIC_WEB_ORIGIN` and `EXPO_PUBLIC_INSTALL_URL`. `eas build -p ios --profile development` lets EAS manage signing with the Apple account.

### Credentials and values needed

| Value | From | Goes to |
|---|---|---|
| Apple ID with Developer Program membership + team id | Apple | `eas build` / `eas submit` login prompts |
| App Store Connect app id (ascAppId) | App Store Connect | `eas submit` prompt, or `submit.production.ios.ascAppId` in eas.json |
| In-App Purchase key (.p8, key id, issuer id) | App Store Connect | RevenueCat |
| RevenueCat public iOS SDK key (`appl_…`) | RevenueCat | EAS env `EXPO_PUBLIC_REVENUECAT_IOS_KEY` |
| RevenueCat secret API key (`sk_…`, v1) | RevenueCat | Server/function secret `REVENUECAT_SECRET_KEY` |
| Webhook Authorization value (choose one) | You | RevenueCat webhook header and secret `REVENUECAT_WEBHOOK_AUTH` (identical) |
| Supabase project URL and anon key | Supabase | EAS env `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase service-role key | Supabase | Engine environment only, never `EXPO_PUBLIC` |
| Public HTTPS engine URL | Your deployment | EAS env `EXPO_PUBLIC_ENGINE_URL` |
| Sandbox tester Apple ID | App Store Connect | Settings › App Store › Sandbox Account on the test phone |

## Exercising a sandbox purchase

On a development or TestFlight build signed in with an eligible Sandbox account: open Plans, buy Weekly (the App Store sheet shows the 3-day trial), confirm the balance shows Plus, use Restore purchases on a second install, buy a 5-reading pack and confirm the balance rises by five, then cancel from Manage or cancel subscription and confirm RevenueCat's expiration webhook ends Plus. Sandbox renewals are accelerated (a week renews in minutes).

`store/CrystalBall.storekit` mirrors the catalog for local StoreKit testing in Xcode (after `npx expo prebuild -p ios`: Product › Scheme › Edit Scheme › Run › Options › StoreKit Configuration). RevenueCat validates those local transactions only after the StoreKit test certificate is uploaded to the RevenueCat app; the App Store sandbox needs no such step. `tests/billing.test.ts` keeps the file in sync with the catalog. It has not been opened in Xcode here because this Mac has no Xcode.

## Follow-ups (out of scope here)

- Texas app-store age-signal plumbing; Android / Play billing; paywall placement experiments; App Store listing copy and screenshots.
- Terms of Use (EULA) and Privacy Policy links on the paywall and in App Store metadata (App Review 3.1.2) once the URLs exist; the captain's paywall redesign owns their placement.
- Consumable refunds are not clawed back from an already-credited pack balance.
