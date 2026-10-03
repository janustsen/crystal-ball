# Editor focus race — resolved at the source

The initial symptom appeared after Cancel, but instrumented reproduction shows the inline draft was already corrupt before that sheet opened. Cancel correctly retained that corrupt value; reapplying an old snapshot would have hidden the earlier failure.

In the captured failure (editor-focus-diagnosis/events.json, repetition2):
-637.0ms: Done commits489 characters.
-639.7ms: React Native Web Modal restores focus to the Expand button.
-645.1ms: editing resumes in the inline question field.
-645.9ms: our extra requestAnimationFrame focus callback runs.
-646.0ms: focus moves back to Expand during text replacement.
-646.6ms: beforeinput targets Expand, rather than the text field.
-647.3ms: the input change contains only11 of the intended33 characters.
-715.6ms: the next expanded editor opens with11 characters; subsequent Cancel preserves11.

An earlier instrumented failure follows the same path for the custom answer, yielding zero instead of27 characters. The committed20-repetition browser regression also went red without instrumentation: expected “A regular creative practice”, received empty. It now asserts the inline replacement itself as well as Cancel/Done, complete draft preservation, focus and request count.

Fix: remove the duplicate deferred focus restoration from ExpandableInput. The existing React Native Web modal focus trap already restores its opener during unmount. No draft snapshot, timeout or resize workaround is needed. Sharing's explicit focus override is still needed because export disables its trigger while opening; it now runs synchronously in onDismiss rather than scheduling another frame that can steal later focus. Native focus behavior is not inferred from this browser trace.

The diagnostic source logging was removed. Retained event records contain only fixture character counts, control IDs and timings.
