# App Store readiness — 2026-10-20

**Not submission-ready.** Entertainment disclosure follows the [UI rules](../design/ui-rules.md#palette-and-composition); data-flow disclosure in Settings, optional Apple backup/restore, and opt-in disclosure before hosted AI processing remain implemented. It does not establish predictive accuracy or guarantee approval.

## First TestFlight upload: Individual membership, then one tester week

The account holder enrolls personally in the **Individual** Apple Developer Program. Do not create Apple, Expo or App Store Connect accounts from this checklist. There is no App Store Connect access until Apple approves membership. Friends and Stanford testers are external testers; plan roughly one week of TestFlight feedback before submitting to the public App Store.

Prepared in this repository: bundle ID `com.janustsen.crystalball`, marketing version `0.1.0`, initial iOS build number `1`, and EAS `production` with `distribution: store`, real purchases and automatic remote build-number increments. Remote EAS numbering is authoritative once linked; record the actual build number on upload. `preview` is ad hoc distribution, not TestFlight. There is no EAS project ID yet. On 2026-10-20, `npx eas-cli whoami` returned **Not logged in**. No archive or upload has been attempted.

### Before the Apple account is approved

- [ ] Expo account holder runs `npx eas-cli login` using an existing account. If no account exists, the holder creates it personally.
- [ ] Run `npx eas-cli whoami`, then `npx eas-cli init`; select the intended owner and link/create the EAS **project** (not an account). Commit the resulting `extra.eas.projectId`. Never invent an ID.
- [ ] Configure the production EAS environment with the public RevenueCat iOS SDK key, Supabase URL/anon key, hosted HTTPS engine endpoint, named AI provider, shared web origin and install URL listed in [billing](billing.md) and the setup guide. Server keys stay server-only. Hosted readings, quotas and spend caps belong to the hosted-readings task; confirm that deployment is ready before building.
- [ ] Run `npm ci`, `npm run check`, `npm test` and the project verification drives. Recheck native icon/splash, room asset delivery, permissions, privacy/terms/support URLs and the release checklist below; these remain required for a usable tester build.

### After Apple approves the Individual membership

1. In App Store Connect, accept Paid Apps terms and finish tax/banking. Register the bundle ID above and create the Crystal Ball app record (iOS, version `0.1.0`); record its numeric Apple app ID. Configure the capabilities used by the app and EAS signing for the approved Individual team.
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
4. Verify `npx eas-cli whoami`, `npx eas-cli project:info` and `npx expo config --type public`. Confirm the linked project, bundle ID, production endpoints and store billing mode; keep `EXPO_PUBLIC_APPLE_LINK_ENABLED=false` until its separate native release gate is complete.
5. Run `npx eas-cli build --platform ios --profile production`. Follow the account holder's Apple signing prompts. Record the **build ID** printed by this command and its version/build number.
6. Run `npx eas-cli submit --platform ios --profile production --id <BUILD_ID>`. Select the existing App Store Connect record. Set `submit.production.ios.ascAppId` to that record's numeric ID for repeatable future submissions. Uploading sends the build to TestFlight, not to public sale.
7. In TestFlight, complete export-compliance questions, beta description, contact and review access, then create an external friends/Stanford group. Submit the group's first build for Beta App Review; invite testers after approval. Do not grant friends App Store Connect roles just to bypass external review.
8. Across roughly one tester week, verify launch/onboarding/skip, the first-reveal Plus offer, real readings, cancellation/pending purchases, eligible trial, renewal/expiration, both packs, reconciliation failure/retry and Restore on a second installation. TestFlight IAP uses Apple's sandbox; it does not collect real payments. Consumables restore from this app's server ledger under the same account, not Apple's consumable history; account restore must be verified before promising cross-install pack recovery.
9. Fix tester blockers and rebuild/re-upload with a new build number. Then finish the public listing, screenshots, App Privacy, age rating, purchase review information and release checks below; choose the tested build and submit for App Review. TestFlight approval is not App Store approval.

[Expo TestFlight distribution](https://docs.expo.dev/submit/testflight/), [upload commands](https://docs.expo.dev/submit/ios/), [remote build numbering](https://docs.expo.dev/build-reference/app-versions/).

## Campaign source handling

Apple campaign attribution lives in **App Store Connect Analytics**, separate from the optional onboarding answer. The app cannot recover a per-install `ct` source from an App Store campaign link. Do not pretend a deep link is deferred attribution or match the anonymous tally to an account.

When Apple exposes Campaigns for this app, generate the first link there to obtain the real provider token. Keep `pt` unchanged; use one `ct` per publishing account (for example `tiktok_janus`, `instagram_janus`, `instagram_stanford_club`). Maintain a launch sheet of account, token, full generated URL and publish date. Link form: `https://apps.apple.com/app/id<APPLE_APP_ID>?pt=<PROVIDER_TOKEN>&ct=<ACCOUNT_TOKEN>&mt=8`. Use the actual app record/token, never the bundle ID or a guessed token. A web install button may use a complete generated campaign URL via `EXPO_PUBLIC_INSTALL_URL`; preserve its query parameters.

Read results in Analytics → Metrics → Campaign. Apple credits eligible first downloads within 24 hours of a click, using the latest campaign link; reporting is delayed and small cohorts may be withheld. Campaign creation itself may wait for initial app analytics. TestFlight invitations are separate. The four onboarding choices (TikTok, Instagram, A friend, Other) are optional, saved only on-device, and reported to the existing anonymous daily tally after the age gate. The legacy tally value `Somewhere else` displays as Other; no schema migration is needed. Skip sends no answer. [Apple campaign-link behavior and reporting](https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links).

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

Answer the rating questionnaire for the actual astrology, generated person readings, UGC, mature themes, fear/horror, health references and news links. No wagering or prizes; Golden forecasts are cosmetic and must never imply greater accuracy. No Kids Category launch is proposed.

## DeepInfra processing disclosure

Privacy-policy wording for the selected hosted reading service: With your permission, Crystal Ball sends your question, relevant answers and saved reading headlines to DeepInfra, Inc. to generate readings, insights and sharing safety checks using Qwen/Qwen3.5-9B. Friend readings also use the friend's sun sign and shared themes. DeepInfra states that these inference inputs and outputs exist in memory during processing, are deleted afterward, and are not used for training. It retains request metadata such as request ID, cost and sampling parameters; its documentation does not specify a metadata retention duration. See [DeepInfra data privacy](https://docs.deepinfra.com/account/data-privacy) and [privacy policy](https://deepinfra.com/privacy), checked 2026-10-20. Avoid sensitive details. Revoking AI permission in Settings stops new AI requests; it does not delete previously saved readings. Local development continues to use its configured local provider.

The budget ledger stores amounts and random reservation IDs; per-user quota rows contain the Supabase user ID, UTC date, action category and attempt count. They do not store prompts or generated text. Existing reading/social storage has its own retention and deletion behavior. Publish this wording at the final privacy URL and reconcile App Privacy Details before release; a document in this repository is not a published policy.

## School-location privacy follow-up

School features are integrated; the [school boundary](../social/school.md) owns lookup, storage, visibility and native permission details. Before public release, reconcile the public privacy policy and nutrition labels with that implementation and complete the native and teen-safety checks documented there.

## Apple backup setup and release blockers

`EXPO_PUBLIC_APPLE_LINK_ENABLED` defaults to `false`; set it to `true` only after the configuration below is complete. See [backup usage and replacement semantics](../../README.md) for the user-facing contract and [platform availability](../../SETUP.md#known-prototype-boundaries) for when the panel appears. For first-time authentication, Save links the anonymous UID and Restore signs into an existing Apple account. A nonce binds the native token exchange. No name/email scopes are requested.

Apply the ownership migration before enabling clients: predictions use `(user_id,id)` and RLS scopes reads/writes to `auth.uid()`. Offline changes remain local and upload on a later state change or restart. Hydration and manual backup lock state mutations. Failed restore reads leave local readings and remembered answers unchanged; authentication can still refresh the account’s billing balance. See [backup safety evidence](blast-radius.md) for the implementation checks.

Follow [Supabase Apple auth](https://supabase.com/docs/guides/auth/social-login/auth-apple) and [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking): configure the Apple capability, signing identifiers, Supabase Apple provider and manual linking; retain nonce verification. Use a hosted Supabase project only after authorization. Existing Expo plugin/`usesAppleSignIn` remain in place.

Before turning on for real users: implement in-app account deletion with server-side Apple token revocation and cascading data deletion. A local reset or sign-out is not sufficient. That server flow requires Apple developer credentials and must be verified end to end; do not put an admin key in the app. [Apple account deletion requirements](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

Device checks still required: initial link, cancellation, existing-account Restore on a second installation, offline restore/retry, revoked credentials, deletion/revocation, VoiceOver, microphone denial and actual IAP. See [recorded verification coverage](../../README.md); an iOS JS export cannot prove these native behaviors.
