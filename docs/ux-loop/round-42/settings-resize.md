# Text-size control and delayed navigation measurement

The initial settings regression showed the focused Large text control entirely outside the viewport after enabling200%. The first correction scrolled it after the text-size render and passed the focused check. The full run reproduced a remaining partial clip (intersection ratio0.7794).

The instrumented unpatched browser capture in settings-resize-all-fixed/geometry-2-Large-text-1791075270824.json shows the mechanism: scrollIntoView places the68px control at y655–723 inside the72–723 content viewport. On the following frame the tab bar's measured height is applied, shortening the viewport to72–708, while the control stays at655–723. This is a two-pass layout race, not loss of keyboard focus. Other unpatched runs passed; they do not negate the failing trace.

The correction tracks an actual user text-size toggle until the navigation padding matches the tab bar's rendered height plus the existing40px orb overhang. It reapplies nearest scrolling when that measured height reaches state, then clears the intent. Unrelated navigation resizes cannot scroll the settings control. No deferred focus callback, timer or arbitrary delay is introduced.

The diagnosis scripts are browser-only instrumentation of viewport rectangles, control labels and synthetic settings state. One initial harness attempt wrote undefined trace data after page reload; it was corrected and retained separately. The first patch attempt failed an exact-text assertion before writing source, so its passing/failing checks are explicitly retained as unpatched evidence.

Passing trace: settings-resize-fixed-trace repeats three fresh runs. Each records the first scroll to655–723, then a second scroll to640–708 after the viewport becomes72–708. The control is fully visible in the final geometry. The ordinary keyboard/persistence check also passes both starting text sizes. No focus is moved by the correction.
