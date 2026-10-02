# Explicit selection: shared behavior audit

Product revision ed791ede replaces timed answer submission with a selected draft and explicit Continue/Reveal. It leaves the final request generation/predicting guards and answer validation intact. The check-in outcome similarly stays local until Save outcome; stored schema and existing history entries are unchanged.

The critical facts were exercised in the running app: selecting or changing an answer never submits; double activation advances once and starts one final request; Back restores the committed prior answer. Four normal/reduced × normal/200% combinations pass in explicit-choice/feedback.json. The actual Ollama reading-flow driver also passes with the new explicit commit control.

RadioGroup is shared by answers, plans and outcomes. React Native Web's PressResponder only treats Space as activation for button-like roles, so the browser check exposed a missing Space action for radio. The group now handles Space and arrow/Home/End navigation, scoped to enabled radios in its own element, and unregisters on unmount. The normal/200% keyboard driver exercises plan and answer groups, roving Tab stops and focus restoration with zero axe violations. Outcome-final checks exercise the third group, prove selection does not mutate storage, discard an unsaved keyboard selection on reload, and persist/correct all three outcomes through Save. Native hardware and VoiceOver remain unverified.

BirthdayInput retains its draft parts and YYYY-MM-DD emission/validation while changing large text to day/month on one row and year below. The running age-editor check retains invalid/partial inputs, rejects under13, corrects to eligible age, cancels without mutation and saves/reloads at both text scales. No age-policy or storage change.

The custom-answer 500px check initially exposed a clipped question after scrolling to submit. A shorter field in the constrained viewport now keeps the whole question and submit in view; Back to choices remains retrievable above, preserves text and restores focus. This is a synthetic viewport constraint, not native keyboard certification.
