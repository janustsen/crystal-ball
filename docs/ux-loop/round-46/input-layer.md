# Input ink hidden by decoration

A blind round45 reviewer found blank populated fields in the saved screenshots. The values were retained, but the plain PaperArt absolute-positioned sibling painted above the unpositioned TextInput. Draft and focus tests checked DOM state, and the contrast sampler only visited text nodes, so neither proved that input value glyphs reached the pixels.

Before the fix, check-input-ink.mjs filled the birthday day15, captured the field, made the input text transparent and captured again. Changed ink pixels:0 (required>40). The screenshots are identical, reproducing real occlusion. The failure is preserved in ink-failure/. This is not a missing-evidence penalty to dismiss.

The smallest fix is to position the shared TextInput above its decorative layer. The same pixel comparison must pass for day/month/year, question, expanded editor, first name, time and city at both normal and200% text. Existing draft/focus/no-request and contrast gates still apply; this check complements them rather than replacing them.

The first positioned-field run revealed glyphs (for example11825 changed pixels in the expanded editor), then stopped on an incorrect test-only city locator. The runner now uses the actual accessible Birth city field. Adding direct input-value contrast measurement then found4.434:1 against the darkest writing texture, below4.5. Shared field ink and placeholder colors were deepened, and fields explicitly retain the owner's centered text direction. These are separate preserved observations, not a passed16-field gate yet.

The second contrast run passed the normal-scale field families and enlarged day/month/year/question, but expanded200% failed at1.592:1. Ink is now visible; the failure remains in the direct pixel-background contrast gate. The input-layer/ink-color changes remain uncommitted. No16-case pass or9/10 claim is valid. Per the repeated-obstacle rule, escalate this second contrast failure to Firstmate before further implementation. Next investigation should check the scrolled glyphs against the writing paper's clipped edge and ensure the artwork covers the full text viewport, rather than weakening the contrast threshold.

## Structural correction after instruction025

The writing viewport now has a solid aged-paper fill (#dec9a2), dark ink (#24180f), and an8px outer inset. Decorative texture remains behind the irregular outer frame, never behind value glyphs. The TextInput is positioned above the artwork, and its own scroll viewport clips inside the writing surface. This fixes the material/layer relationship rather than repeatedly tuning ink against changing texture.

All16 actual-field pixel comparisons pass:8 field families at100% and200%, minimum10.706:1. See ink-solid/ink.json; expanded200% was visually inspected. The24 expanded-editor cases pass at360/390/430 ×500/844 ×100/200%, retaining draft, focus, no-request and overflow assertions. Age edit/correction/save/cancel checks pass at both scales with zero axe violations. Typecheck and171 tests pass.

Blast radius: shared Input affects birthday, composer/expanded editor, person, birth details, school search and social friend entry. The safety fact is that decorative inset changes neither the TextInput ref nor draft/event forwarding, and constrained scrolling still keeps full drafts. The running expanded-editor/age checks prove this for their paths; authenticated social and native device behavior are not established by these browser checks. Direct SocialExtras TextInputs have opaque backgrounds already and are outside the occluded decorative Input mechanism. Full layout and final exact-head verification still follow during the design loop.
