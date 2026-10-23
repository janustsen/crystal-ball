# App Store readiness — 2026-10-20

**Not submission-ready.** Entertainment disclosure follows the [UI rules](../design/ui-rules.md#palette-and-composition); data-flow disclosure in Settings, optional Apple backup/restore, and opt-in disclosure before hosted AI processing remain implemented. It does not establish predictive accuracy or guarantee approval.

## First TestFlight upload: Individual membership, then one tester week

The account holder enrolls personally in the **Individual** Apple Developer Program. Do not create Apple, Expo or App Store Connect accounts from this checklist. There is no App Store Connect access until Apple approves membership. Friends and Stanford testers are external testers; plan roughly one week of TestFlight feedback before submitting to the public App Store.

Prepared in this repository: bundle ID `com.janustsen.crystalball`, marketing version `0.1.0`, initial iOS build number `1`, and the native `CrystalBall` scheme. **The launch route is local prebuild → Xcode Release archive → Organizer or Transporter upload.** It uses the same local native toolchain as the iPhone reinstall, with paid-team distribution signing instead of a Personal Team sideload. No Expo account or EAS project ID is required. There is no Expo account; do not create one. No signed archive or upload has been attempted.

### Before the Apple account is approved

- [ ] Install/use the existing Xcode and CocoaPods toolchain. Run `npm ci`, `npm run check`, `npm test` and the project verification drives. Recheck native icon/splash, room asset delivery, permissions, privacy/terms/support URLs and the release checklist below.
- [ ] Prepare the ignored local release environment (`.env.local`, loaded by Expo's native bundling step): `EXPO_PUBLIC_REVENUECAT_MODE=store`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ENGINE_URL` (hosted HTTPS endpoint including its engine route), `EXPO_PUBLIC_AI_PROVIDER_NAME`, `EXPO_PUBLIC_WEB_ORIGIN` and `EXPO_PUBLIC_INSTALL_URL`. See [billing](billing.md) and [Social v2 delivery](../../SETUP.md#social-v2-delivery). Keep `EXPO_PUBLIC_APPLE_LINK_ENABLED=false` until its separate native release gate is complete. Remove preview-token/tailnet overrides from the release environment; server service-role/provider/RevenueCat secret keys never enter the app. Hosted readings, quotas and spend caps belong to the hosted-readings task; confirm that deployment is ready before archiving.
- [ ] Confirm `version: "0.1.0"` and `ios.buildNumber: "1"` in `app.json`. For each later upload, increment `ios.buildNumber` and rerun prebuild; local Xcode uploads do not use EAS remote auto-increment.
- [ ] From the project root, generate/update the local native project and installed pods, then open the workspace:

  ```sh
  npm run prebuild:release
  open ios/CrystalBall.xcworkspace
  ```

  Use the workspace, not the project alone, so CocoaPods/RevenueCat are linked. Preserve the existing iPhone build tooling; do not use `--clean` or a personal-sideload installer that rewrites the production bundle ID or strips capabilities. Review `ios/.xcode.env.local` for stale development overrides. Verify the generated app **and widget extension** Info plists show version `0.1.0` / build `1`. Expo can write these as literal plist values, so Xcode build-setting overrides alone are not a substitute for updating `app.json` and regenerating. In Product → Scheme → Edit Scheme, confirm **Archive** uses **Release**; keep the normal Release JavaScript bundle step enabled. A Debug/Metro install is not the archive for TestFlight.

### Verified locally before signing

On 2026-10-20, `xcodebuild -list -workspace ios/CrystalBall.xcworkspace -json` found scheme `CrystalBall`. The same workspace's Release build settings resolve `CrystalBall.app`, bundle ID `com.janustsen.crystalball`, version `0.1.0`, build `1` and the installed iPhoneOS SDK. The generated app and widget plists also contain `0.1.0` / `1`. These are configuration checks, not a successful archive, signing, upload or native-purchase test. Paid-team signing remains blocked on Apple approval.

### After Apple approves the Individual membership

1. In App Store Connect, accept Paid Apps terms and finish tax/banking. Register the bundle ID above and create the Crystal Ball app record (iOS, version `0.1.0`); record its numeric Apple app ID. Configure the capabilities used by the app for the approved Individual team.
2. Create the following US-price products. All three subscriptions belong to the same **Crystal Ball Plus** group. Add descriptions, review information and required localizations. Introductory trials apply only to eligible new subscribers.

   | Product ID | Type | US price / introductory offer | Current offering |
   |---|---|---|---|
   | `cb_plus_weekly` | Auto-renewable, 1 week | $4.99; 3-day free trial | Yes |
   | `cb_plus_monthly` | Auto-renewable, 1 month | $9.99; no trial | Yes |
   | `cb_plus_yearly` | Auto-renewable, 1 year | $39.99; 7-day free trial | **No: annual cost gate remains closed** |
   | `cb_pack_5` | Consumable | $1.99; 5 non-expiring questions | Yes |
   | `cb_pack_20` | Consumable | $5.99; 20 non-expiring questions | Yes |

   Leave `cb_year_ahead` out of this launch; it is a separate mock-only feature.
3. Configure RevenueCat's iOS app, App Store credentials, entitlement `plus` and current offering per [billing](billing.md). Confirm the engine and webhook can reconcile purchases to the same Supabase user ID. Plus is 10 questions/day, never unlimited; Free is 20 starter questions, then 1/day.
4. In Xcode → Settings → Accounts, sign in with the approved Individual account. In the workspace, choose scheme **CrystalBall**, then **Any iOS Device (arm64)** / the generic iOS device destination. In Signing & Capabilities, select the paid Developer team and automatic signing for the app and widget extension, retaining their app-group and other configured capabilities. Confirm the app's bundle ID matches the App Store Connect record; a free Personal Team sideload ID/profile cannot be uploaded. Select the `CrystalBall` archive scheme, not `RitualUITests`.
5. Create the Release archive with Product → Archive. To use the same local toolchain from Terminal instead, replace `PAID_TEAM_ID` with the approved team's ID and run from the project root:

   ```sh
   mkdir -p /tmp/fm-cb-store-ready/archives
   xcodebuild \
     -workspace ios/CrystalBall.xcworkspace \
     -scheme CrystalBall \
     -configuration Release \
     -sdk iphoneos \
     -destination 'generic/platform=iOS' \
     -derivedDataPath /tmp/fm-cb-store-ready/xcode-derived-data \
     -archivePath /tmp/fm-cb-store-ready/archives/CrystalBall-0.1.0-1.xcarchive \
     DEVELOPMENT_TEAM=PAID_TEAM_ID CODE_SIGN_STYLE=Automatic \
     MARKETING_VERSION=0.1.0 CURRENT_PROJECT_VERSION=1 \
     -allowProvisioningUpdates archive
   open /tmp/fm-cb-store-ready/archives/CrystalBall-0.1.0-1.xcarchive
   ```

   Do not disable signing for the distributable archive. In Window → Organizer → Archives, confirm `Crystal Ball` version `0.1.0` / build `1` and inspect the archived app and embedded extension's version/bundle IDs. The `/tmp/fm-cb-store-ready/` archive/DerivedData are disposable task output; recreate them if cleanup has removed them.
6. In Organizer, select that archive → **Distribute App** → **TestFlight & App Store**, then validate/upload with the approved team. On Xcode versions with the older flow, choose **App Store Connect → Upload**. Check the signing/provisioning summary and finish Upload. Do not choose **TestFlight Internal Only**, since this build must reach external testers and later App Store review. For a **Transporter** upload instead, use Organizer's custom **App Store Connect → Export** distribution flow to export a distribution-signed `.ipa` into `/tmp/fm-cb-store-ready/exports/`; sign in to Apple's Transporter app with the approved account, add that `.ipa`, validate and Deliver. Do not hand Transporter the raw `.xcarchive` or a Personal Team/ad hoc `.ipa`. Record the uploaded version/build and delivery result; Apple must finish processing before the build appears in TestFlight. Uploading does not put it on public sale.
7. In TestFlight, complete export-compliance questions, beta description, contact and review access, then create an external friends/Stanford group. Submit the group's first build for Beta App Review; invite testers after approval. Do not grant friends App Store Connect roles just to bypass external review.
8. Across roughly one tester week, verify launch/onboarding/skip, the first-reveal Plus offer, real readings, cancellation/pending purchases, eligible trial, renewal/expiration, both packs, reconciliation failure/retry and Restore on a second installation. TestFlight IAP uses Apple's sandbox; it does not collect real payments. Consumables restore from this app's server ledger under the same account, not Apple's consumable history; account restore must be verified before promising cross-install pack recovery.
9. Fix tester blockers, increment `ios.buildNumber` in `app.json`, rerun prebuild and archive/upload again. Then finish the public listing, screenshots, App Privacy, age rating, purchase review information and release checks below; choose the tested build and submit for App Review. TestFlight approval is not App Store approval.

[Expo local release builds](https://docs.expo.dev/guides/local-app-production/), [Apple archive distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases), [Organizer upload](https://help.apple.com/xcode/mac/current/en.lproj/dev442d7f2ca.html), [Apple upload tools including Transporter](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds).

### Optional later path: EAS

The existing `eas.json` production profile remains available if an Expo account is authorized later. It is not a launch prerequisite. Do not create an Expo account or run EAS initialization for this launch. A future switch would need an account/project link, public build environment, distribution signing and its own build-number coordination; EAS remote auto-increment does not govern the local Xcode route above. Remote push uses direct APNs from Supabase, without an Expo account or EAS project ID; see [launch infrastructure](infrastructure.md). Local notifications remain independent.

## Campaign source handling

Apple campaign attribution lives in **App Store Connect Analytics**, separate from the optional onboarding answer. The app cannot recover a per-install `ct` source from an App Store campaign link. Do not pretend a deep link is deferred attribution or match the anonymous tally to an account.

When Apple exposes Campaigns for this app, generate the first link there to obtain the real provider token. Keep `pt` unchanged; use one `ct` per publishing account (for example `tiktok_janus`, `instagram_janus`, `instagram_stanford_club`). Maintain a launch sheet of account, token, full generated URL and publish date. Link form: `https://apps.apple.com/app/id<APPLE_APP_ID>?pt=<PROVIDER_TOKEN>&ct=<ACCOUNT_TOKEN>&mt=8`. Use the actual app record/token, never the bundle ID or a guessed token. A web install button may use a complete generated campaign URL via `EXPO_PUBLIC_INSTALL_URL`; preserve its query parameters.

Read results in Analytics → Metrics → Campaign. Apple credits eligible first downloads within 24 hours of a click, using the latest campaign link; reporting is delayed and small cohorts may be withheld. Campaign creation itself may wait for initial app analytics. TestFlight invitations are separate. The four onboarding choices (TikTok, Instagram, A friend, Other) are optional, saved only on-device, and reported to the existing anonymous daily tally after the age gate. The legacy tally value `Somewhere else` displays as Other; no schema migration is needed. See [onboarding usage](../../README.md) for how to leave the question unanswered. [Apple campaign-link behavior and reporting](https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links).

## Review checklist

| Area | Current evidence / remaining action |
|---|---|
| Fortune-telling saturation (4.3) | High review risk. Explain the distinctive interactive context cards, explicit assumptions/Why and revisitable history. A polished orb alone does not establish differentiation. |
| Truthful claims (1.1.6) | Follow the [voice guide](../voice.md) for reveal/share wording; never advertise certainty or measured predictive accuracy. An entertainment disclaimer does not cure misleading functionality. |
| Harmful advice (1.4) | Existing death, self-harm, illness, pregnancy and legal redirects must pass both plan and predict checks. No credit/history side effects. Run held-out cases on the selected hosted model; broaden harmful-content review before public access. |
| AI data sharing (5.1.2) | Named-provider opt-in implemented; server rejects missing/mismatched consent. Publish actual provider/retention before enabling. |
| Login (5.1.1) | No first-launch sign-in. Apple backup is reached from You only. Native linking/restore requires configuration and a device drive. |
| Teens / social UGC (1.2) | Onboarding and social workers own the 13+ gate and teen controls. Verify AI filtering before every publication, report, block, repeated-report auto-hide, timely moderation and reachable contact details on the merged app. Not verified by this launch-only branch. |
| Complete app (2.1) | Hosted authenticated engine, live support/privacy URLs, signing, icons/screenshots and review access remain release work. |
| Payments (3.1) | IAP products, restore, Apple subscription management link, renewal terms and server entitlements are implemented ([billing](billing.md)); sandbox purchase, Terms/Privacy links and App Store Connect setup remain. |

These are our application-specific conclusions against [Apple's review guidelines](https://developer.apple.com/app-store/review/guidelines/), not Apple's approval.

## Privacy nutrition label draft

Draft for a hosted engine + Supabase backup release; reconcile with final SDK manifests, vendors, logging and retention. Apple counts retained off-device information, including information collected by partners. See [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).

| Data category | Purpose | Linked to identity? | Tracking? |
|---|---|---|---|
| User ID (Supabase anonymous ID, later Apple-linked account) | App functionality, backup | Yes | No |
| Other user content (questions, answers, predictions, remembered facts) | App functionality, inference, backup | Yes when mirrored | No |
| Financial information / other financial info (assets, debts, savings supplied for money readings) | App functionality | Yes when saved | No |
| Coarse location / school selection | See the [school privacy boundary](../social/school.md#app-store-privacy-and-native-release-note); volunteered city is used for readings | Yes for saved city or chosen school | No |
| Birth details / signs / chart weather / school and social content | Age gating, personalization and approved social features; see the [profile/API contract](../../SETUP.md#reading-profile-and-birth-chart) for chart processing and storage | Yes for account-held chart weather and saved or mirrored content | No |
| Purchase history | App functionality (RevenueCat and the Supabase reading ledger) | Yes | No intended tracking |
| Email/name | No name/email scopes requested by the app; audit identity-provider claims retained by Supabase before deciding whether to declare | Potentially yes | No |
| Audio data | App does not retain audio; verify OS speech processing and any retained third-party audio | Pending native audit | No intended tracking |
| Other usage data (optional onboarding answer: where the user heard about Crystal Ball) | Optional answer stays on-device; analytics stores only a daily count per answer (`supabase/migrations/202610140010_heard_from.sql`) | No | No |
| Diagnostics / device identifiers | Review Expo, RevenueCat and production server logs | Pending release audit | No intended tracking |

Free text may contain additional sensitive data. Discourage it and audit actual collection; do not claim “Data Not Collected.” See [forgetting information](../../README.md) for local removal and saved-reading exceptions, and [profile mirroring](../../SETUP.md#reading-profile-and-birth-chart) for backup propagation and its verification limits. Reset is not account deletion. Specify retention, deletion, operator/contact, subprocessors and international transfers in a public policy; the in-app prototype explanation is not a complete legal policy.

## Approved audience and age-rating target

Captain decision: **13+ audience**, with the onboarding birthday serving as the age gate; block under-13 users. Target **App Store 12+**, replacing the earlier 18+ proposal. Apple's current rating bands use 13+ on newer systems, while 12+ belongs to the older rating system. Complete the actual questionnaire honestly and inspect both generated displays (including the Declared Age Range API requirement if selecting Apple’s social-media-disabled-under-13 capability); do not promise a selectable 12+ value on current platforms or weaken the in-app 13+ gate to match a storefront label. [Apple age-rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions).

The reading-flow worker owns onboarding. Before launch, verify that known under-13 users cannot create an account or proceed into personal-data collection, hosted readings or social features. The shared profile contract keeps birthday skippable; unknown age uses teen-safe defaults and must never unlock adult features. Review the actual neutral age-screen design and data collection against the intended audience before launch. Test the day-before/day-of 13th birthday and age changes without collecting real child data. Do not treat an age screen alone as proof of COPPA compliance; audience design and actual knowledge also matter. [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).

The [profile contract](../../SETUP.md#reading-profile-and-birth-chart) owns the implemented onboarding eligibility fields and optional birth chart. Before release, verify on native builds that optional backup authentication cannot create an ID before the age-screen outcome, including on reload; browser and unit evidence does not establish that native boundary.

Before release, verify the integrated [social safeguards](../social/model.md) and [reading safety policy](../research/safety-policy.md) on native builds. The 18+ person-reading direction still does not permit content that violates Apple's safety rules; implemented prototype controls do not establish release readiness.

Social-worker requirements: every published Star is an AI-filtered anonymous rewrite approved by its author; never publish the raw question. Users can report content and block people; repeated reports auto-hide. Verify failures stay unpublished, blocked users cannot bypass controls, and the operator has a timely review/contact process. AI filtering plus controls must be demonstrated, not described as automatic compliance. No public chat is proposed, but Stars are UGC and must be declared/reviewed accordingly. [Apple UGC requirements](https://developer.apple.com/app-store/review/guidelines/#user-generated-content).

Answer the rating questionnaire for the actual astrology, generated person readings, UGC, mature themes, fear/horror, health references and anonymous Stars. No wagering or prizes; Golden forecasts are cosmetic and must never imply greater accuracy. No Kids Category launch is proposed.

## Cloudflare and DeepInfra processing disclosure

Privacy-policy wording for public inference: With your permission, Crystal Ball sends your question, relevant answers and saved reading headlines to Cloudflare, Inc. to generate readings, insights and sharing safety checks using Cloudflare-hosted Llama 3.3. Friend readings also use the friend's sun sign and shared themes. When the free allowance cannot admit a request, DeepInfra, Inc. may receive the same information to complete it using Qwen/Qwen3.5-9B. Both providers state that they do not train on these inference inputs or outputs. Cloudflare normally retains content only for processing and delivery; security, legal and optional feature-storage exceptions apply. DeepInfra states that ordinary Qwen content is processed in memory and deleted afterward. Both retain operational metadata; their inference documentation does not specify a universal metadata-retention period. See [Cloudflare data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/) and [DeepInfra data privacy](https://docs.deepinfra.com/account/data-privacy), checked 2026-10-23. Avoid sensitive details. Revoking AI permission stops new requests; it does not delete saved readings.

**Built with Llama.** Cloudflare hosts the Llama model; inference does not send prompts to Meta. See the [Llama 3.3 Community License](https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct/blob/main/LICENSE). Product attribution appears in the permission details and Settings. Keep Cloudflare Gateway content logging/caching and optional vendor data sharing disabled.

The service-only ledgers record the actual provider/model, account/reset bucket, random attempt ID, reserved/used units and settlement outcome, never prompts or generated text. Paid rows identify the pinned DeepInfra model by their money-ledger contract. Per-user quota rows contain a Supabase user ID, UTC date, action category and count. Existing app/Supabase reading storage has separate retention and deletion behavior. Publish this policy at the final privacy URL, reconcile App Privacy Details, contact/subprocessor/international-transfer wording and obtain new `cloudflare-deepinfra-v1` consent before activation. Old single-provider consent cannot authorize this chain. A repository document is not a published policy.

## School-location privacy follow-up

School features are integrated; the [school boundary](../social/school.md) owns lookup, storage, visibility and native permission details. Before public release, reconcile the public privacy policy and nutrition labels with that implementation and complete the native and teen-safety checks documented there.

## Apple backup setup and release blockers

`EXPO_PUBLIC_APPLE_LINK_ENABLED` defaults to `false`; set it to `true` only after the configuration below is complete. See [backup usage and replacement semantics](../../README.md) for the user-facing contract and [platform availability](../../SETUP.md#known-prototype-boundaries) for when the panel appears. For first-time authentication, Save links the anonymous UID and Restore signs into an existing Apple account. A nonce binds the native token exchange. No name/email scopes are requested.

Apply the ownership migration before enabling clients: predictions use `(user_id,id)` and RLS scopes reads/writes to `auth.uid()`. Offline changes remain local and upload on a later state change or restart. Hydration and manual backup lock state mutations. Failed restore reads leave local readings and remembered answers unchanged; authentication can still refresh the account’s billing balance. See [backup safety evidence](blast-radius.md) for the implementation checks.

Follow [Supabase Apple auth](https://supabase.com/docs/guides/auth/social-login/auth-apple) and [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking): configure the Apple capability, signing identifiers, Supabase Apple provider and manual linking; retain nonce verification. Use a hosted Supabase project only after authorization. Existing Expo plugin/`usesAppleSignIn` remain in place.

In-app Delete account and data now invokes server-side Apple token revocation followed by cascading hard deletion; failed revocation leaves the account intact. A local reset or sign-out is not sufficient. The [deletion and infrastructure contract](infrastructure.md) lists exact credentials, retry behavior and remaining real-account/device checks. Keep Apple backup disabled until those checks pass; no admin or Apple key belongs in the app. [Apple account deletion requirements](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

Device checks still required: initial link, cancellation, existing-account Restore on a second installation, offline restore/retry, revoked credentials, deletion/revocation, VoiceOver, microphone denial and actual IAP. See [recorded verification coverage](../../README.md); an iOS JS export cannot prove these native behaviors.


## Infrastructure deployment

See [launch infrastructure](infrastructure.md) for the account/secret checklist, Cloudflare static deploy, Supabase scheduler, direct APNs and deletion gates. News lookups are disabled for the first release. Public information URLs are prepared at `https://crystalball.janustsen.com/privacy`, `/terms` and `/support`; publication remains pending the real release environment.
