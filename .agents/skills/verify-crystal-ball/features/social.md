# Sky and Circles

## Sub-features
Synthetic theme stars; AI-rewritten and explicitly approved anonymous Stars; resonance, report, block and withdrawal. Private Circles by single-use invitation; day/theme/sun-sign activity and fixed reactions. Adult opt-in Friend readings for Plus; anonymous recipient notification. Moderated headline-only seals, claimed by tapping the ball.

## How to get to it (user POV)
Sky → Tonight’s Sky or Circles. Add my star rewrites the latest private reading, then asks for approval. Create a circle → Invite a friend; the link recipient explicitly joins. A Circle friend must enable Friends can ask about me before a Plus member can ask about them. From a friend forecast, Seal for a friend → Create sealed link; recipient taps the ball.

## Driving it with chrome-devtools-axi
`node scripts/drive-social.mjs` uses three isolated browser sessions and real Ollama. It publishes an approved Star, creates and joins a Circle, resonates, rejects invite replay, enables adult consent, requests a Plus Friend reading, seals it, opens it by orb tap, rejects a second recipient, sends encouragement, verifies the anonymous notice and leaves. The adult-profile fixture and Auth/PostgREST simulation are labeled in the evidence. `bash scripts/verify-social-db.sh` covers reports, blocks, quota, expiration, capacity, direct-write rejection and concurrent claims in real PostgreSQL roles. `node scripts/prove-social-model.mjs` checks one identifying sample and one sensitive-input refusal; do not describe that as comprehensive moderation accuracy.

## Gotchas
Samples are labeled and never counted as people. Unknown/teen ages cannot enable Friend-reading consent. No raw private question or author identity appears in the Sky projection. The AI draft expires after 15 minutes; invitations after seven days; sealed cards remain available until revoked. Free seals are one per UTC calendar week, including revoked cards. The real Supabase transport and native link delivery remain separate verification prerequisites.
