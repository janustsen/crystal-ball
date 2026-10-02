# Share / explanation boundary check

The change reorders real Share controls and compresses explanation context; it does not alter prediction, storage or exported pixels. Export formats still use the same stillImage producer and `/engine/share` endpoint. The meaningful new state is an in-flight export guard plus format-specific local feedback.

Safety facts exercised in the running app:
- Two synchronous activations started two requests before the fix and one after. The video control is disabled while work is held, the friend tool stays enabled, and the real control is reenabled after injected failure. The returned error is not success. See share-feedback-before/ and share-feedback-after/.
- Explanation still renders every original reason, fact, assumption and no-source state. Both normal and200% runs opened each section using Enter, found exact original content, passed axe, and returned keyboard focus to the original disclosure. See why-after/why.json.

Library / boundary details: React state alone would not guard two events in the same turn, so a ref closes the duplicate-request window synchronously. `finally` reopens it for both success and failure. Web export initiation cannot prove the user saved a file; copy says download started. Expo Sharing does not prove recipient delivery; native copy only acknowledges the sheet closing. Those native boundaries remain unverified.

Remaining checks: actual production PNG/MP4 drive after this change, all144 layouts, settled/transition contrast, reduced motion and isolated ~60fps drive. The native screen-reader announcement is implemented but browser focus/axe does not prove VoiceOver or TalkBack.
