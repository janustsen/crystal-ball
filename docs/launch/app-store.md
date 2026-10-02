# App Store readiness — 2026-09-30

**Not submission-ready.** This pass adds explicit entertainment copy at Home/Ask, accurate data-flow disclosure in You, optional Apple backup/restore, and opt-in disclosure before hosted AI processing. It does not establish predictive accuracy or guarantee approval.

## Review checklist

| Area | Current evidence / remaining action |
|---|---|
| Fortune-telling saturation (4.3) | High review risk. Explain the distinctive interactive context cards, explicit assumptions/Why and revisitable history. A polished orb alone does not establish differentiation. |
| Truthful claims (1.1.6) | Keep speculative labels on reveal/share; never advertise certainty or measured predictive accuracy. An entertainment disclaimer does not cure misleading functionality. |
| Harmful advice (1.4) | Existing death, self-harm, illness, pregnancy and legal redirects must pass both plan and predict checks. No credit/history side effects. Run held-out cases on the selected hosted model; broaden harmful-content review before public access. |
| AI data sharing (5.1.2) | Named-provider opt-in implemented; server rejects missing/mismatched consent. Publish actual provider/retention before enabling. |
| Login (5.1.1) | No first-launch sign-in. Apple backup is reached from You only. Native linking/restore requires configuration and a device drive. |
| Teens / social UGC (1.2) | Onboarding and social workers own the 13+ gate and teen controls. Verify AI filtering before every publication, report, block, repeated-report auto-hide, timely moderation and reachable contact details on the merged app. Not verified by this launch-only branch. |
| Complete app (2.1) | Hosted authenticated engine, live support/privacy URLs, signing, icons/screenshots and review access remain release work. |
| Payments (3.1) | Mock plans clearly say no payment. Replace with reviewed IAP products, restore, subscription terms and real entitlements before monetization. |

These are our application-specific conclusions against [Apple's review guidelines](https://developer.apple.com/app-store/review/guidelines/), not Apple's approval.

## Privacy nutrition label draft

Draft for a hosted engine + Supabase backup release; reconcile with final SDK manifests, vendors, logging and retention. Apple counts retained off-device information, including information collected by partners. See [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).

| Data category | Purpose | Linked to identity? | Tracking? |
|---|---|---|---|
| User ID (Supabase anonymous ID, later Apple-linked account) | App functionality, backup | Yes | No |
| Other user content (questions, answers, predictions, remembered facts) | App functionality, inference, backup | Yes when mirrored | No |
| Financial information / other financial info (assets, debts, savings supplied for money readings) | App functionality | Yes when saved | No |
| Coarse location / school selection | See the [school privacy boundary](../social/school.md#app-store-privacy-and-native-release-note); volunteered city is used for readings | Yes for saved city or chosen school | No |
| Birthday / school / sun sign and social content | Age gating, personalization and approved social features | Yes when saved or mirrored | No |
| Purchase history | App functionality, once real RevenueCat billing is enabled | Review SDK configuration | No intended tracking |
| Email/name | No name/email scopes requested by the app; audit identity-provider claims retained by Supabase before deciding whether to declare | Potentially yes | No |
| Audio data | App does not retain audio; verify OS speech processing and any retained third-party audio | Pending native audit | No intended tracking |
| Diagnostics / device identifiers | No analytics added here; review Expo, RevenueCat and production server logs | Pending release audit | No intended tracking |

Free text may contain additional sensitive data. Discourage it and audit actual collection; do not claim “Data Not Collected.” Facts forgotten in You are removed from remembered answers; historical readings retain the context they were made from. Reset is not account deletion. Specify retention, deletion, operator/contact, subprocessors and international transfers in a public policy; the in-app prototype explanation is not a complete legal policy.

## Approved audience and age-rating target

Captain decision: **13+ audience**, with the onboarding birthday serving as the age gate; block under-13 users. Target **App Store 12+**, replacing the earlier 18+ proposal. Apple's current rating bands use 13+ on newer systems, while 12+ belongs to the older rating system. Complete the actual questionnaire honestly and inspect both generated displays (including the Declared Age Range API requirement if selecting Apple’s social-media-disabled-under-13 capability); do not promise a selectable 12+ value on current platforms or weaken the in-app 13+ gate to match a storefront label. [Apple age-rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions).

The reading-flow worker owns onboarding. Before launch, verify that known under-13 users cannot create an account or proceed into personal-data collection, hosted readings or social features. The shared profile contract keeps birthday skippable; unknown age uses teen-safe defaults and must never unlock adult features. Review the actual neutral age-screen design and data collection against the intended audience before launch. Test the day-before/day-of 13th birthday and age changes without collecting real child data. Do not treat an age screen alone as proof of COPPA compliance; audience design and actual knowledge also matter. [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).

The shared profile stores optional ISO `birthday`, derived lowercase `sunSign` (null when skipped), and `ageBand: teen | adult | null`. Reading-flow owns these fields; this branch does not duplicate them. Under-13 users never get an account: verify that the optional backup authentication cannot create an ID before the age-screen outcome, including on reload. This integration check is pending the onboarding merge. Optional birth time/place and moon/rising signs are later additions.

For ages 13–17 and unknown age, require invite-only Circles and “friends can ask about me” off. Person readings must never be cruel or humiliating or claim knowledge of someone's real feelings. The 18+ person-reading direction still does not permit content that violates Apple's safety rules. These are acceptance criteria for the integrated reading/social flows, not controls implemented in this launch branch.

Social-worker requirements: every published Star is an AI-filtered anonymous rewrite approved by its author; never publish the raw question. Users can report content and block people; repeated reports auto-hide. Verify failures stay unpublished, blocked users cannot bypass controls, and the operator has a timely review/contact process. AI filtering plus controls must be demonstrated, not described as automatic compliance. No public chat is proposed, but Stars are UGC and must be declared/reviewed accordingly. [Apple UGC requirements](https://developer.apple.com/app-store/review/guidelines/#user-generated-content).

Answer the rating questionnaire for the actual astrology, generated person readings, UGC, mature themes, fear/horror, health references and news links. No wagering or prizes; Golden forecasts are cosmetic and must never imply greater accuracy. No Kids Category launch is proposed.

## School-location privacy follow-up

School features are integrated; the [school boundary](../social/school.md) owns lookup, storage, visibility and native permission details. Before public release, reconcile the public privacy policy and nutrition labels with that implementation and complete the native and teen-safety checks documented there.

## Apple backup setup and release blockers

`EXPO_PUBLIC_APPLE_LINK_ENABLED` defaults to `false`; set it to `true` only after the configuration below is complete. See [backup usage and replacement semantics](../../README.md) for the user-facing contract. For first-time authentication, Save links the anonymous UID and Restore signs into an existing Apple account. A nonce binds the native token exchange. No name/email scopes are requested. Web displays a clear fallback.

Apply the ownership migration before enabling clients: predictions use `(user_id,id)` and RLS scopes reads/writes to `auth.uid()`. Offline changes remain local and upload on a later state change or restart. Hydration and manual backup lock state mutations. Failed restore reads leave local data unchanged. See [backup safety evidence](blast-radius.md) for the implementation checks.

Follow [Supabase Apple auth](https://supabase.com/docs/guides/auth/social-login/auth-apple) and [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking): configure the Apple capability, signing identifiers, Supabase Apple provider and manual linking; retain nonce verification. Use a hosted Supabase project only after authorization. Existing Expo plugin/`usesAppleSignIn` remain in place.

Before turning on for real users: implement in-app account deletion with server-side Apple token revocation and cascading data deletion. A local reset or sign-out is not sufficient. That server flow requires Apple developer credentials and must be verified end to end; do not put an admin key in the app. [Apple account deletion requirements](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

Device checks still required: initial link, cancellation, existing-account Restore on a second installation, offline restore/retry, revoked credentials, deletion/revocation, VoiceOver, microphone denial and actual IAP. Xcode is unavailable; an iOS JS export cannot prove these native behaviors.
