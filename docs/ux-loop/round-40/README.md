# Round40

Expansion40's two independent comparisons selected sharing B (focused outcome sheet) and evidence C (section index plus readers). Implemented at82dfc280. Review deck will contain current production captures only, not prototype alternatives or prior scores.

Sharing now separates outcomes from the image thumbnail. Export, invitation and reminder messages use a scrollable sheet with Done. Enlarged ready layout stacks preview and action; status after dismissal uses full width. Browser invitation copy has explicit success and a selectable-link fallback when clipboard access is denied. The unchanged1080×1920 PNG excludes private context. Native sharing remains distinct from confirmed delivery.

Plus reading details provides four section links and focused readers, with complete stored text, top/bottom returns and restored index focus. Free explanation stays immediate. Legacy introductory copy is reader-facing. Home's unavailable omen says Omen unavailable and Next: tomorrow; the expanded note distinguishes the free daily attempt from reading balance.

Preserved failures: initial share result dismissal failed focus restoration, fixed by restoring on modal dismissal; normal/200% rechecks pass. Initial layout and omen-storage checks expected superseded copy; those assertions were migrated while preserving attempt-count and complete-policy checks. One expanded-editor cancel-retention failure is retained, with an unchanged-code24-combination recheck that passes; cause remains unconfirmed. Do not treat that as a proved host-load exception.

Diagnostic background images and actual PNG exports are not phone screenshots and are excluded from the grading deck. Mock speech/share/clipboard boundaries, simulated billing, and unconfigured Circles are labeled. Physical iPhone, Dynamic Type, native keyboard/VoiceOver, actual OS share and native notifications remain unverified by browser work.

## Reproduced blocker

A targeted repeat of the exact360px normal-text editor sequence failed again on repetition5 at500px height: after Cancel, other-input was empty instead of “A regular creative practice”. Four earlier repetitions and the separate24-combination recheck passed. This now has two observed failures; the passing run does not clear it. Product editor source is unchanged in this round. Cause is not established and no host-load explanation is claimed. Full-app grading is held. Per brief rule5, report to Firstmate and stop; inbox010 only exempts repeated layout overflow, not draft loss. Reproduction: node docs/ux-loop/round-40/editor-stress.mjs. Logs: editor-stress/failure.log and expanded-editor/failure.log.

## Resolution

Firstmate inbox011 authorizes fixing in-scope bugs. Instrumentation traced the reproduced failure to duplicate deferred focus restoration, not Cancel applying a stale snapshot. Commit f210f47a removes the redundant editor callback and makes sharing dismissal focus synchronous. The regression goes red before and passes20 repetitions /80 checks after; the full24-combination editor and both sharing-focus checks pass. See editor-race.md for decisive event order. Grading may resume.
