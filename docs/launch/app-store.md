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
| Coarse location (city volunteered in relocation answers) | App functionality | Yes when saved | No |
| Purchase history | App functionality, once real RevenueCat billing is enabled | Review SDK configuration | No intended tracking |
| Email/name | No name/email scopes requested by the app; audit identity-provider claims retained by Supabase before deciding whether to declare | Potentially yes | No |
| Audio data | App does not retain audio; verify OS speech processing and any retained third-party audio | Pending native audit | No intended tracking |
| Diagnostics / device identifiers | No analytics added here; review Expo, RevenueCat and production server logs | Pending release audit | No intended tracking |

Free text may contain additional sensitive data. Discourage it and audit actual collection; do not claim “Data Not Collected.” Facts forgotten in You are removed from remembered answers; historical readings retain the context they were made from. Reset is not account deletion. Specify retention, deletion, operator/contact, subprocessors and international transfers in a public policy; the in-app prototype explanation is not a complete legal policy.

## Age rating draft

Use the current App Store Connect questionnaire, not a hard-coded rating. Current global bands include 4+, 9+, 13+, 16+, 18+, with regional/platform differences. Recommend an **18+ override for initial public evaluation**, subject to captain approval; this is not implemented as an age gate or represented as an assigned rating. See [Apple's age-rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions).

Answer truthfully for actual generated content: AI content capabilities, health/wellness discussion, mature themes, fear/horror and external news links need review even when sensitive forecasts redirect. No gambling, prizes, simulated wagering or public chat is provided. Do not mark all categories “none” solely because prompts discourage them. No Kids Category launch is proposed.

## Apple backup setup and release blockers

The default flag remains off. You offers backup after the user chooses to visit it; the first reading remains anonymous. A native Apple button appears only on supported, configured iOS. Save links the anonymous UID; Restore signs into the existing Apple account, reads all cloud pages, merges history by reading ID, preserves local edits, and excludes credits/Plus from restoration. A nonce binds the native token exchange. No name/email scopes are requested. Web displays a clear fallback.

Apply the ownership migration before enabling clients: predictions use `(user_id,id)` so a reading can be copied from an anonymous device to its Apple account without a cross-owner primary-key collision. RLS still scopes reads/writes to `auth.uid()`. Save/restore is serialized behind pending local writes; a failed cloud read disables later automatic uploads for that session to protect the unread archive. Retry via You. This is backup/restore, not conflict-free live multi-device sync; concurrent fact/outcome edits are last-write wins.

Follow [Supabase Apple auth](https://supabase.com/docs/guides/auth/social-login/auth-apple) and [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking): configure the Apple capability, signing identifiers, Supabase Apple provider and manual linking; retain nonce verification. Use a hosted Supabase project only after authorization. Existing Expo plugin/`usesAppleSignIn` remain in place.

Before turning on for real users: implement in-app account deletion with server-side Apple token revocation and cascading data deletion. A local reset or sign-out is not sufficient. That server flow requires Apple developer credentials and must be verified end to end; do not put an admin key in the app. [Apple account deletion requirements](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

Device checks still required: initial link, cancellation, existing-account Restore on a second installation, offline restore/retry, revoked credentials, deletion/revocation, VoiceOver, microphone denial and actual IAP. Xcode is unavailable; an iOS JS export cannot prove these native behaviors.
