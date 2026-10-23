# Launch infrastructure — 2026-10-23

Use Cloudflare Pages for the Expo web export and information pages, and one Supabase project for Auth, Postgres, Edge Functions and Cron. No production request or scheduled job needs the iMac. Public inference uses the existing separately approved Cloudflare Free and DeepInfra paths; this change does not select or approve a model. [Visual review](infrastructure.html).

| Path | Release execution | Persistent state |
|---|---|---|
| App plan/prediction, Bond, insights, chart weather | `predict` Edge Function → shared handler → hosted provider | Supabase allowances, optional Apple backup |
| Daily personal omen | `predict`, action `omen`; computed sky and model call in Deno | Device omen cache; server request/budget ledger |
| Link visitor’s free web reading | Static Expo app → anonymous Auth session → `predict`; proof and dedicated web claim | Postgres browser/network/daily claim; no reading credits debited |
| Anonymous Stars, Circle and Friend inference | `predict/social`; existing consent, membership and moderation checks | Supabase receipts and social tables |
| Shared Friday Sky | `open-sky` Edge Function, hourly Cron | One moderated omen per group/week; missing groups retry |
| Social/Friday push | `social-push` Edge Function, minutely Cron → APNs directly | Existing leased queues and separate consent flags |
| Apple backup/deletion | Native Apple authentication; `delete-account` Edge Function | Account-owned rows cascade on hard deletion |
| Billing | Existing `predict/billing` and `revenuecat` functions | Existing server entitlement/pack ledger |

Supabase Free currently allows 150 seconds wall time and 2 seconds CPU per request. Public inference receives a shared 110-second deadline across calls and repairs. Sky receives a 105-second deadline and retries missing groups hourly. Push stops taking additional jobs after 100 seconds; unsent claims become eligible after their five-minute lease. This is suitable for the expected low usage; it does not promise an unbounded group backlog will finish in one run. The cron schedule uses roughly 44,640 invocations per 31-day month before app requests, below the current 500,000 free allowance. Free projects can pause for low database activity; this is not an uptime guarantee. See [function limits](https://supabase.com/docs/guides/functions/limits), [invocation allowance](https://supabase.com/docs/guides/functions/pricing), and [free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing). No paid host or upgrade was provisioned.

News is disabled by the single `newsLookupsEnabled` flag in `src/launch.ts`, before any RSS fetch. Why/Plus copy makes no promise of News research. Old saved readings retain their original sources. Do not enable the flag without licensed commercial sources and a corresponding privacy review.

## Exact credentials and settings

Names and destinations only: never paste secret values into source, this document, evidence, or a PR. Public build settings are intentionally bundled; server secrets must never receive an `EXPO_PUBLIC_` prefix.

| Name | Destination | Supplied/configured by |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Local deploy shell or protected deployment environment | Supabase account holder; CLI deployment credential |
| `SUPABASE_DB_PASSWORD` | Local migration/deploy shell; passed privately to CLI | Supabase project owner |
| Project reference | Supabase CLI `link --project-ref` / `--project-ref` | Supabase project owner |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase’s built-in Edge Function environment | Platform provides these; never copy service key into the app |
| `DEEPINFRA_API_KEY` | Supabase Function secrets (predict and scheduled Sky inference) | DeepInfra account holder |
| `MODEL_PROVIDER`, `HOSTED_MODEL_DISCLOSURE` | Supabase Function settings | Set to `hosted` and `cloudflare-deepinfra-v1`; see `supabase/hosted.env.example` |
| `DEEPINFRA_QUALITY_APPROVED`, `CLOUDFLARE_QUALITY_APPROVED` | Supabase Function settings | Keep each false until that pinned provider/model’s own retained semantic/safety comparison is approved |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Supabase Function secrets/settings (predict and scheduled Sky inference) | Dedicated Workers Free account; token authorized for Workers AI inference |
| `CLOUDFLARE_WORKERS_PLAN` | Supabase Function settings | Set to `free`; do not upgrade or enable billable overage |
| `APP_ORIGIN` | Supabase Function settings | Set to the HTTPS Crystal Ball web origin |
| `WEB_READING_SALT` | Supabase Function secrets | Operator generates a stable random secret for salted network hashes |
| `WEB_READING_DAILY_CAP` | Supabase Function settings | Existing default 500; optional lower operational cap |
| `SCHEDULER_SECRET` | Supabase Function secrets | Operator generates a random secret; same secret goes in Vault below |
| `crystal_ball_project_url` | Supabase Vault | Project’s HTTPS base URL |
| `crystal_ball_scheduler_secret` | Supabase Vault | Same secret as `SCHEDULER_SECRET` |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` | Supabase Function secrets | Apple Developer account holder: APNs auth key ID, team ID and complete `.p8` PEM |
| `APNS_BUNDLE_ID`, `APNS_ENVIRONMENT` | Supabase Function settings | Production bundle identifier; production for TestFlight/App Store, sandbox for development provisioning |
| `APPLE_KEY_ID`, `APPLE_TEAM_ID`, `APPLE_PRIVATE_KEY` | Supabase Function secrets | Apple Developer account holder: Sign in with Apple key ID, team ID and complete `.p8` PEM; distinct purpose from APNs key |
| `APPLE_CLIENT_ID` | Supabase Function settings | Native app bundle identifier used to exchange the native Apple code |
| `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH` | Supabase Function secrets; webhook’s matching Authorization header in RevenueCat | RevenueCat operator; see [billing](billing.md) |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Local deploy shell or protected deploy environment | Pages deployment account; token needs Pages edit and zone DNS access for domain binding. Separate purpose from the dedicated inference account above |

| Public build setting | Destination and value source |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Ignored release env / Pages build environment; approved project’s HTTPS URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same; project’s public anon key, never service role |
| `EXPO_PUBLIC_ENGINE_URL` | Same; exactly that project’s `/functions/v1/predict` URL |
| `EXPO_PUBLIC_AI_PROVIDER_NAME` | Same; `Cloudflare and DeepInfra`, mapped by the app to consent ID `cloudflare-deepinfra-v1` matching server `HOSTED_MODEL_DISCLOSURE` |
| `EXPO_PUBLIC_WEB_ORIGIN` | Same; `https://crystalball.janustsen.com` |
| `EXPO_PUBLIC_INSTALL_URL` | Same; actual Apple app/campaign URL once the app record exists, preserving query parameters |
| `EXPO_PUBLIC_APPLE_LINK_ENABLED` | Same; false until Apple linking, restore and deletion pass on a device; true in the verified launch build |
| `EXPO_PUBLIC_REVENUECAT_MODE`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | Native release env; real store mode and RevenueCat public iOS SDK key |
| `EXPO_PUBLIC_ROOM_ASSET_BASE` | Optional public build env; `/room` when deploying the prepared optional room loops |
| `CRYSTAL_BALL_RELEASE` | Build-only environment flag; set to true by `npm run build:web`, `npm run prebuild:release`, and the generated native Release bundle phase; not an app secret |

Remove `EXPO_PUBLIC_PREVIEW_SECRET`, private-engine overrides and mock-purchase settings from release environments. `SOCIAL_MOCK_ENTITLEMENTS` stays unset/false on the server. No Expo account, EAS project ID or Expo push credential is required. No TikTok/Instagram credential is used by this infrastructure; those accounts remain outside this change.

Other required console settings: Supabase anonymous sign-in and manual identity linking enabled, native Apple provider configured for the bundle ID, Apple Sign in with Apple and Push Notifications capabilities enabled on the app ID/provisioning, correct paid-team signing for app and widget, and RevenueCat products/entitlement/webhook configured per the existing billing checklist. Apple native-token client IDs belong in Supabase Auth’s authorized Apple client IDs. Keep Apple backup off until the configured flow is verified.

## Deploy Supabase after the project exists

1. Use only the approved project. Link with `npx supabase link --project-ref PROJECT_REF`, then `npx supabase db push`. The migration sequence now has unique versions: web readings is `202610060061`, Year ahead is `202610140011`. For a **pre-existing** database that recorded one of the former duplicate versions, inspect its migration history and tables before repair; do not blindly mark migrations applied or replay non-idempotent DDL. A fresh project is the intended launch target.
2. Load server settings through an ignored local env file using `npx supabase secrets set --env-file /absolute/path/to/ignored/server.env`. Use `supabase/hosted.env.example` as the names-only template. Do not set the built-in Supabase variables again. Keep quality approval false until the separate provider gate passes.
3. Deploy with `npx supabase functions deploy predict revenuecat open-sky social-push delete-account --use-api`. The committed function settings disable gateway JWT verification because each entry point checks its own credential: Auth `/user` for readings/deletion, RevenueCat authorization for its webhook, and the separate scheduler secret for jobs. Public keys and ordinary user sessions cannot run scheduler jobs. The Deno import map handles the shared ephemeris package; never deploy the loopback Node adapter.
4. Enable `pg_cron` and `pg_net` on this project. Add the two Vault secrets listed above using the Supabase dashboard. Apply `supabase/schedule.sql` once in its SQL editor. Cron job names are stable, so rerunning replaces their schedules. There is no iMac cron. Inspect Cron run details and `net._http_response` for successful hourly/minutely responses, not merely successful enqueueing.
5. Run deployed unauthenticated/expired-session, consent, quota and budget-denial checks, then the authorized real-provider smoke. No such call was made by this task. Confirm both queues stay retryable after transient failures and that actual APNs success is acknowledged. Apple/provider/deployed Auth checks remain credential-dependent.

## Static web deploy

Cloudflare Pages is the existing demo-host precedent; the current account and `janustsen.com` zone were readable with the existing credential. A Crystal Ball Pages project/domain has not been created. Deployment is prepared, not live: the Supabase project and provider/Apple activation gates remain pending. Local export proof uses an explicitly synthetic project URL and must never be published.

1. Populate the public release settings above. Run `npm ci`, `npm run check`, `npm test`, then `npm run build:web`. The release guard rejects missing settings, a private/iMac engine URL or a preview token. Use `npm run prebuild:release` for native release preparation; the config plugin also sets the flag inside Xcode’s Release bundle phase, including GUI archives. `--no-dev` previews do not infer release from `NODE_ENV` or process arguments.
2. Deploy `dist/` with the committed `wrangler.jsonc`. If the Pages project does not exist, create `crystal-ball` in the existing account on the free plan, then run `npx wrangler pages deploy dist --project-name crystal-ball --branch main`. For Git-integrated builds, set build command `npm run build:web`, output directory `dist`, and the public build variables in Pages. Never send server/provider/Apple secrets to Pages.
3. In that Pages project, add Custom Domain `crystalball.janustsen.com` and let Cloudflare bind the matching DNS record in the existing zone. Use the actual deployment hostname returned by Pages; do not guess a CNAME target. Wait for active HTTPS and confirm the root app, `/privacy`, `/terms`, `/support`, and a sealed-link query URL. [Cloudflare custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) and [free limits](https://developers.cloudflare.com/pages/platform/limits/).
4. The static build contains standalone privacy/terms/support pages and the Cloudflare/DeepInfra disclosure. `_redirects` serves clean information URLs; Pages’ built-in single-page-app fallback serves incoming app links (there is no top-level 404 page). Report contact is the existing public address `janustsen@outlook.com`. Monitor that inbox and the `star_reports` table for timely moderation; repeated-report auto-hide complements operator review. No moderation dashboard is introduced.

## Apple deletion and push behavior

Deletion is available beside Apple backup in You once `EXPO_PUBLIC_APPLE_LINK_ENABLED` is enabled. It asks for destructive confirmation and fresh Apple authorization. The Edge Function authenticates the Supabase session, exchanges the code server-side, checks the returned Apple subject against that account’s linked identity, revokes its refresh token, then hard-deletes that Supabase user. A failed exchange/revocation does not delete the account. A failed database delete after revocation asks for retry/support. Successful deletion removes account-owned backup, Stars, owned Circles, tokens and linked usage via existing foreign-key cascades and clears this device’s archive under the backup lock. An explicit server refusal preserves the local archive. An uncertain response locks it pending local cleanup; retry clears this device but does not confirm remote deletion, which requires support. A durable deletion marker prevents old-archive hydration after restart. Cleanup retries archive, omen, reminder, widget and local authentication removal before clearing that marker; failed cleanup keeps the app locked. See [user controls](../../README.md) and `tests/deletion-boundaries.test.mjs` / `scripts/verify-apple-restore.mjs` for the boundary checks. Apple subscriptions must be canceled separately; deleting an app account does not cancel them.

Push uses native APNs tokens, ES256 provider authorization and HTTPS/HTTP2, preserving the existing generic `aps` alert plus `body` routing data. Development and production tokens must use their matching APNs environment. One token per account remains the supported contract. The migration drops obsolete Expo relay tokens, so existing test installations must register again. APNs HTTP 200 is acceptance, not proof of notification display or tap routing. Failed/unregistered tokens remain retryable after the user re-registers; delivery is at least once around a lost acknowledgement. Android remote push is outside this iOS release; local reminders remain supported.

## Verification and remaining release gates

Local proof: full TypeScript/test suite; real PostgreSQL report/block/three-report auto-hide and account cascades; actual Supabase CLI migration application and repeat push; Deno entry-point checks; real local Qwen inference for app, omen, free web and social paths; no-dev preview regression; native prebuild, generated Release flag and iOS JavaScript export with the native widget module; Apple panel success/failure boundary drive; and the exported static app/information pages at mobile width. These are not a hosted-provider quality pass, a physical-device APNs pass, or Apple account deletion against real accounts. See [verification recipes](../../.agents/skills/verify-crystal-ball/features/hosted.md).

Still needed from the captain’s accounts: Apple membership/keys/signing and device verification; approved Supabase target; hosted-provider key and retained semantic/safety gate; real RevenueCat/Apple products as already documented; actual App Store install URL. Then deploy and verify the hosted service, schedules, DNS/HTTPS, push registration/delivery/taps, Apple save/restore/deletion and store purchase recovery. No paid inference, TestFlight upload, social-account setup, DNS mutation or public deploy occurred in this task.
