# Social boundary

Tonight’s Sky Stars are public. Circles and sealed forecasts are private. Publishing a user’s content always needs explicit approval. Shared insights follow the separate [Friday Sky contract](#friday-sky).

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

The profile integration reads the account's `sunSign` and `ageBand` fields, owned by the reading-flow worker. The account owns `birthday`; the social profile does not publish it or use it to override a null `ageBand`. Generated friend readings, Star/seal drafts and Circle forecast receipts follow the [all-age output safeguards](../research/safety-policy.md). Friend requests carry viewer context for the astrology line under the [profile/API contract](../../SETUP.md#reading-profile-and-birth-chart); ordinary Friend generation uses only the subject’s Sun sign and broad activity themes as profile context. For Circle Bonds, the server derives the named bond from the viewer’s birthday and the friend’s Sun sign. The generation model receives the first name, the bond’s two images, shared themes and local calendar date, not raw Sun signs; it draws the explanation from the images’ concrete qualities and shared themes. Circle Bonds use the same Friend authorization and notice boundary. See the [school boundary](school.md) for optional school selection, location privacy and school-based visibility.

## Proof and limits

`bash scripts/verify-social-db.sh` creates and removes its own PostgreSQL cluster, loads the actual migrations, and runs roles and policies as separate users. It tests draft ownership, direct-write rejection, anonymous projection, invite replay/expiry, Circle capacity, leaving, consent defaults/teen constraints, friend notice privacy, reports, blocks, weekly seals, and concurrent recipient claims. The auth schema is a minimal Supabase stub: this proves PostgreSQL RLS, not Supabase Auth or PostgREST interoperability.

The cluster requires SCRAM-SHA-256 authentication over loopback TCP, using a fresh password generated with `openssl` on each run. The script exports `PGPASSFILE` pointing to `.local/social-pg-${SOCIAL_PG_PORT:-55439}.pgpass`, created with owner-only permissions and removed with the cluster on exit. Separate database clients must use that password file and the same port; `scripts/drive-social-v2.mjs` selects the file automatically from its `SOCIAL_PG_PORT` (default 55449), which must match the running cluster.

For UI verification, `SOCIAL_DB_SERVE=1 bash scripts/verify-social-db.sh` leaves that same isolated cluster running behind `scripts/social-dev-transport.mjs`. The transport simulates Auth/PostgREST on loopback only, while SQL, RLS, app code and Ollama are real. It is verification tooling, never a production fallback. No Docker, hosted accounts or paid services are needed.

Anonymous-account reports are not proof of distinct humans. Hosted rate limits, anti-abuse controls and native delivery remain deployment boundaries. Entitlements and purchase deployment follow the [billing contract](../launch/billing.md).

Detailed executable boundary proof and remaining integration risks: [blast radius evidence](../evidence/social-blast-radius.md). Browser privacy journey: [social drive](../evidence/social-drive.json). Real-model sample moderation: [model sample](../evidence/social-model.json).

## Accepted v1 social semantics

The requester enters a local nickname for a selected Circle member. It is not a verified identity: consent, sign, activity themes and the anonymous notice stay bound to the selected member ID. “Someone asked about you” records an authorized attempt, including one later cancelled or refused; it does not promise that a forecast was delivered.

Age is client-declared in v1, not independently verified. Onboarding and its birthday gate belong to the reading-flow feature. Friend consent stays off unless the profile is adult; output moderation follows the [safety policy](../research/safety-policy.md).

Blocking prevents either account from resonating with or reporting the other's Stars, even with a retained Star ID. Existing reactions and reports stay stored for audit but do not affect public totals across that block. A handled invitation is removed from the route after join or decline so navigation and reload cannot replay the prompt.

## Social v2

Profiles add unique lowercase handles (3–24 letters, digits or underscores), display names and a fixed avatar choice. `search_handles` exposes exactly handle/name/avatar. Adults are searchable by authenticated accounts. Teens are searchable only by explicit teen profiles with the same non-null chosen school. Unknown-age profiles are not discoverable and cannot discover teens; they retain teen safeguards. Blocks hide both directions. Circle-only member projections add identity while keeping sun signs inside shared membership.

Handle invitations are seven-day requests: recipients accept or silently decline; a sender may have at most 20 pending requests created that UTC day. Membership insertion enforces 5 Circles per free account or 10 with Plus, and 20 members per Circle. Owners remove members or transfer ownership. Leaving as owner passes ownership to the earliest remaining member; leaving the last place deletes the Circle. Ownership changes invalidate outstanding links and pending handle requests. Issuance and acceptance lock the Circle before invitation records and revalidate under those locks; membership insertion also serializes on the joining profile. See `scripts/social-invitation-races.py` for concurrent ownership and acceptance coverage.

Joining shares consultation day/theme and sun sign, plus content-free check-in moments and golden draws. Personal questions stay private except for explicitly approved Circle forecasts. Fixed reactions are ✦, ❤️, 🌙 and ✨. Consultation updates record a glow when everyone consulted that UTC day. Recorded glow days remain; nothing breaks or resets. These activities never queue pushes.

Circle forecasts are the explicit exception to private questions: the asker sees a warning and approves a question/headline/due-date receipt after both lines pass teen-audience AI moderation. Only the trusted service can write receipts. Publishing serializes on the Circle and permits one forecast with a future due date; retrying the same receipt is idempotent. Charging follows the [billing contract](../launch/billing.md). Normal publication saves the asker’s local Reading under the archive lock; refresh does not debit a device-local balance or insert history. Circle due dates and voting eligibility use the UTC calendar day. Current members can vote Yes / Not quite / Not yet on or after the due date; the RPC returns the tally and the caller’s vote. Leaving immediately removes shared access.

A Circle owner with Plus can make the Circle a private room (`set_private_room`). While the room is on, `circle_vote_tallies` returns null counts with `sealed=true` and only the caller's own vote, until every current member has voted or the UTC day after the due date begins. Plus is checked only when enabling the room. Ownership transfers and subscription lapses preserve the room and its sealed votes; the current owner can always turn it off. Members participate free. Past forecasts appear on the room's Circle shelf with the Circle's own votes; there is no accuracy score. `bash scripts/verify-social-db.sh` runs `scripts/private-room-rls.sql`.

Targeted seals use the same weekly quota and moderation gate as links. The inbox reveals only the token and opened state; the headline still requires the intended recipient’s ball tap. Link cards allow one anonymous browser claimant. Blocking and revocation apply at claim time.

`social_notifications` accepts only seal/invite/join/forecast/vote events. A service-only leased queue dispatches generic Expo messages. See SETUP.md for native credentials, the install URL, scheduler setup and delivery limits. Browser proof does not establish native push delivery.

### Friday Sky

Every Friday at 20:00 on each viewer's own clock, the Sky opens one shared insight per School and one per Circle for the week, until the next Friday at 20:00. A School's insight is visible only to accounts that chose that School, so teens see only their own school's; a Circle's insight only to its current members. Before a group's first insight exists, Sky and Circles say when it opens; if insights cannot load, they say the Friday Sky is unavailable and otherwise keep working. The client sends its IANA time zone on each Sky load (`open_sky`); unknown zones are ignored and an unsaved clock falls back to UTC.

The trusted scheduler generates insights server-side (`scripts/open-sky.mts`): one per group per week, written only by the service. The model receives just the group kind and that Friday’s real sky from `src/real-sky.ts`, never member data, and every insight passes the teen-audience public-Star moderation gate; a failed or unsafe insight leaves the group closed until the next run. Groups have no shared time zone: the sky uses Friday 20:00 UTC and UTC event dates, independent of scheduler time and retries. Each run targets the Friday on or after yesterday (UTC), so insights exist before the earliest zone opens; from Sunday through Thursday (UTC) it first retries any group still missing the current open week's insight.

The Sky push requires separate explicit consent: `sky_push` defaults off for existing and new accounts, including existing Circle-notification subscribers. A native-only prompt in Sky offers Friday notifications once per account; accepting or dismissing persists `sky_push_answered`. Accepting first records the answer with Sky off, then requests permission and the device token and enables Sky with that token only after that succeeds. Circle and Friday Sky share one device token but each checks its own consent: `social_push_tokens.circle_push` gates Circle pushes and `sky_push` gates the Sky push, so Friday opt-in never enables Circle pushes and turning off Circle notifications keeps the token and Friday consent. Permission or registration failures leave Sky off and direct the user to the native Circle notification settings, where the Sky toggle can be changed later. Web never shows the prompt. One generic "The Sky is open." message per account per week is queued from local Friday 20:00 when the account can see at least one insight that week, and each claim, including retries, requires explicit opt-in, that same local Friday at or after 20:00, and a currently visible insight; a missed evening is never sent late. It uses a separate `sky_pushes` lease, not `social_notifications`. `scripts/sky-rls.sql` proves the week math, visibility and lease in real PostgreSQL; `node scripts/drive-friday-sky.mjs` drives generation and display.
