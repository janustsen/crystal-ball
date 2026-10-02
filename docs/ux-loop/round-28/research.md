# Round28 — clear entry and date/field meaning

Round27 minimum7.667 improved0.667, so focused pass rather than mandatory expansion. Both graders called the empty birth-time14:30 placeholder ambiguous after deletion. The concrete value remains only in helper copy; HH:MM is now the empty field's placeholder. The regression check asserts both empty value and format placeholder, plus chart-field deletion/birthday retention. Failing assertion is preserved before source change.

City-search failure/no-results messages now sit directly after the city field and before Find/Retry. Calculation failure remains beside Calculate; forgotten status remains beside the form heading. Existing authoritative chartStatus and field-specific time feedback remain unchanged. Current live success, controlled failure and live retry still pass at both sizes with sampled invalid/saved/forgotten contrast and zero axe.

Onboarding reused the previous step's scroll position. At200%, only0.35648 of the focus heading was in view; normal size also lacked heading focus. Preserved before screenshots/check show both. Each actual onboarding state now focuses its own heading without implicit browser scrolling and resets the screen scroller to top, keeping both step indicator and complete heading visible. Back restores birthday-heading focus. Native announcement uses the matching title; native focus/VoiceOver is not claimed verified. Existing blocked correction/back behavior is preserved.

Check-in dates now explicitly say Check-in reminder in the reveal and upcoming History label. Actual stored dueDate/suggestedCheckIn/outcome logic is unchanged. Existing date tests first failed on the old label and now pass; both legacy-storage fixtures retain history, credits and facts and use the new label. First check-in action remains visible at200% with the longer caption.

126tests/typecheck pass. Current normal200% onboarding entry/Back/selected-focus Skip keep birthday and adult eligibility while storing no skipped focus. Under13 correction/reload guard, invalid birthday, cancel/save/focus/axe still pass. No engine/provider, backup shape, privacy or permission changes. Full17-screen/246-state geometry and real model drives follow on399ccbd.

Both blind graders: minimum8.167/median8.667/notall9, improvement0.5. Remaining convergence is enlarged decorative height/spacing, evidence scanning, Sky topic distance and share text-equivalent access. No mandatory stall expansion next.
