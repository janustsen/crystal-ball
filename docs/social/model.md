# Social boundary

Tonight’s Sky is public. Circles and sealed forecasts are private. Publishing always needs an explicit approval.

```mermaid
flowchart LR
  Reading[Private Reading] --> Rewrite[Local model removes identifying details]
  Rewrite --> Filter[AI safety filter: fail closed]
  Filter --> Draft[Server-owned draft: expires in 15 minutes]
  Draft -->|asker approves wording| Sky[Today's anonymous Star]
  Sky --> Report[Report or block]
  Report --> Hide[3 distinct reports hide the Star]
  Reading --> Activity[Circle activity: see Social v2 below]
  Invite[Single-use link: 7 days] -->|explicit Join| Circle[Private Circle: up to 20]
  Circle --> Consent[Adult friend opts in; default off]
  Consent --> Friend[Plus Friend reading: first name, sign and shared themes only]
  Friend --> Notice[Friend hears someone asked; no question or identity]
  Reading --> SealFilter[AI safety filter]
  SealFilter -->|sender approves| Seal[Headline-only sealed card]
  Seal -->|recipient taps ball| Open[One recipient; for fun]
```

| Data | Access and invariant |
| --- | --- |
| `social_profiles` | Own profile only. Lowercase sun sign; teen/adult/unknown. Friend consent can only be enabled for adults. Plus is server-owned, with an explicit loopback-only mock entitlement boundary for the prototype. |
| `social_drafts` | Trusted moderation service writes only; clients cannot insert or edit. Contains rewritten wording, theme and owner, never the original question. A draft is scoped to star/seal, its owner and a 15-minute lifetime. |
| `sky_stars`, `sky_resonances` | One Star per person/UTC day. Public RPC exposes wording, theme, resonance counts and own flags; no author ID. A second publication that day is refused, including after withdrawal; existing wording, resonance and reports stay attached to the original Star. |
| `star_reports`, `social_blocks` | One report per account/Star; three accounts auto-hide. Block resolves a public Star's author server-side, keeping identity out of the public response. Blocking applies both directions to social visibility and Friend reading authorization. |
| `circles`, `circle_members`, `circle_invites`, `circle_reactions` | Up to 20 members, by single-use links or accepted handle requests. See [Social v2](#social-v2) for shared activity, forecasts, reactions and ownership. Leaving removes access. |
| `friend_notices` | Recipient alone sees that someone asked, and the day; no asker or question stored. Friend consent, membership, blocking and Plus are checked at generation time. |
| `sealed_forecasts` | Moderated headline only; never question, answers or Why. Sender can revoke. Recipient claims by tapping; row lock allows only one claimant. Free: one per UTC calendar week, including revoked cards. Plus: unlimited. Cards do not expire; only invitations expire after seven days. |

All tables have RLS. Security-definer functions pin an empty search path, explicitly qualify schemas, and revoke public/anon execution. Service-only moderation receipts prevent clients bypassing the AI filter. Public words are rewritten and approved, never the raw question. Every newly published user line passes the local model safety filter; deterministic sensitive-topic rules are shared with the reading engine. Seeds are controlled app content, `synthetic: true`, visibly labeled “Sample stars” and excluded from real counts.

The profile integration reads the account's `sunSign` and `ageBand` fields, owned by the reading-flow worker. The account owns `birthday`; it is not shared or used to override a null `ageBand`. Generated friend readings and both shared draft kinds follow the [all-age output safeguards](../research/safety-policy.md). Social code does not collect birthdays or birth time. See the [school boundary](school.md) for optional school selection, location privacy and school-based visibility.

## Proof and limits

`bash scripts/verify-social-db.sh` creates and removes its own PostgreSQL cluster, loads the actual migrations, and runs roles and policies as separate users. It tests draft ownership, direct-write rejection, anonymous projection, invite replay/expiry, Circle capacity, leaving, consent defaults/teen constraints, friend notice privacy, reports, blocks, weekly seals, and concurrent recipient claims. The auth schema is a minimal Supabase stub: this proves PostgreSQL RLS, not Supabase Auth or PostgREST interoperability.

For UI verification, `SOCIAL_DB_SERVE=1 bash scripts/verify-social-db.sh` leaves that same isolated cluster running behind `scripts/social-dev-transport.mjs`. The transport simulates Auth/PostgREST on loopback only, while SQL, RLS, app code and Ollama are real. It is verification tooling, never a production fallback. No Docker, hosted accounts or paid services are needed.

Anonymous-account reports are not proof of distinct humans. Hosted rate limits, anti-abuse controls, verified subscription entitlements and native delivery remain deployment boundaries. No real billing is enabled by this feature.

Detailed executable boundary proof and remaining integration risks: [blast radius evidence](../evidence/social-blast-radius.md). Browser privacy journey: [social drive](../evidence/social-drive.json). Real-model sample moderation: [model sample](../evidence/social-model.json).

## Accepted v1 social semantics

The requester enters a local nickname for a selected Circle member. It is not a verified identity: consent, sign, activity themes and the anonymous notice stay bound to the selected member ID. “Someone asked about you” records an authorized attempt, including one later cancelled or refused; it does not promise that a forecast was delivered.

Age is client-declared in v1, not independently verified. Onboarding and its birthday gate belong to the reading-flow feature. Friend consent stays off unless the profile is adult; output moderation follows the [safety policy](../research/safety-policy.md).

Blocking prevents either account from resonating with or reporting the other's Stars, even with a retained Star ID. Existing reactions and reports stay stored for audit but do not affect public totals across that block. A handled invitation is removed from the route after join or decline so navigation and reload cannot replay the prompt.

## Social v2

Profiles add unique lowercase handles (3–24 letters, digits or underscores), display names and a fixed avatar choice. `search_handles` exposes exactly handle/name/avatar. Adults are searchable by authenticated accounts. Teens are searchable only by explicit teen profiles with the same non-null chosen school. Unknown-age profiles are not discoverable and cannot discover teens; they retain teen safeguards. Blocks hide both directions. Circle-only member projections add identity while keeping sun signs inside shared membership.

Handle invitations are seven-day requests: recipients accept or silently decline; a sender may have at most 20 pending requests created that UTC day. Membership insertion enforces 5 Circles per free account or 10 with Plus, and 20 members per Circle. Owners remove members or transfer ownership. Leaving as owner passes ownership to the earliest remaining member; leaving the last place deletes the Circle. Ownership changes invalidate outstanding links and pending handle requests. Issuance and acceptance lock the Circle before invitation records and revalidate under those locks; membership insertion also serializes on the joining profile. See `scripts/social-invitation-races.py` for concurrent ownership and acceptance coverage.

Joining shares consultation day/theme and sun sign, plus content-free check-in moments and golden draws. Personal questions stay private except for explicitly approved Circle forecasts. Fixed reactions are ✦, ❤️, 🌙 and ✨. Consultation updates record a glow when everyone consulted that UTC day. Recorded glow days remain; nothing breaks or resets. These activities never queue pushes.

Circle forecasts are the explicit exception to private questions: the asker sees a warning and approves a question/headline/due-date receipt after both lines pass teen-audience AI moderation. Only the trusted service can write receipts. Publishing serializes on the Circle and permits one forecast with a future due date; retrying the same receipt is idempotent. It costs the asker one Reading from the existing device-local balance. Refresh charges unpaid forecasts authored by the current user without inserting history. An asker-only RPC records `charged_at`; a forecast-ID receipt is persisted with the device-local debit before that RPC, so retries cannot debit again after a lost response. Receipts survive Forget everything and archive restore. Normal publication alone saves a Reading; the archive lock serializes publication and settlement against refresh and archive replacement. This retains the single-device balance boundary; it is not distributed billing across devices. Billing and entitlements retain the prototype boundary, not server-verified purchases. Current members can vote Yes / Not quite / Not yet on or after the due date; the RPC returns the tally and the caller’s vote. Leaving immediately removes shared access.

Targeted seals use the same weekly quota and moderation gate as links. The inbox reveals only the token and opened state; the headline still requires the intended recipient’s ball tap. Link cards allow one anonymous browser claimant. Blocking and revocation apply at claim time.

`social_notifications` accepts only seal/invite/join/forecast/vote events. A service-only leased queue dispatches generic Expo messages. See SETUP.md for native credentials, the install URL, scheduler setup and delivery limits. Browser proof does not establish native push delivery.
