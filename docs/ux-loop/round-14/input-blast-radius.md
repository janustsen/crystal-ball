# Shared input scaling

The real browser reproduced six fields at 16px after enabling 200% text: onboarding birthday, profile birthday, birth time, birth city, remembered fact and person name. The question already doubled. `input-scale-before/input-scale.json` preserves that failure.

All React Native TextInput callers now use the shared Input wrapper. It applies the same preference multiplier as Txt, retains native font-scaling props and forwards the existing input behavior. Removed the previous question/custom-answer manual multiplier to avoid applying 200% twice. The original field styles remain authoritative.

`input-scale-after/input-scale.json` measures all seven fields at exactly twice their normal font size. Typecheck and all 118 tests pass. The constrained 390×500 browser custom-answer drive retains full question/Choices context, editable long input and focus restoration. Layout sweep covers the new onboarding, birth-profile and named-person forms at all three widths and both text settings.

School and social inputs share the wrapper; full social backend behavior is a separate verification gate. Browser measurements do not establish native Dynamic Type or physical keyboard behavior.
