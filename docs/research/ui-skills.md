# Temporary UI skill references

Captured 2026-09-29. No skill installed. Read the available Frontend Design skill, the UI/UX Pro Max source via gh-axi, and Vercel's published guideline source. Extracted rules govern all project UI in ../design/ui-rules.md. Popularity is not a quality rating; no verified star-review score for these skills is claimed.

| Skill | Source and popularity evidence | Rules selected |
|---|---|---|
| Anthropic Frontend Design | [skills.sh](https://skills.sh/anthropics/skills/frontend-design): 933.1K installs, repository 178.8K GitHub stars | Commit to one subject-specific thesis; expressive display typography; spend visual complexity on the orb; critique actual screenshots. |
| UI/UX Pro Max | [skills.sh](https://skills.sh/nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max): 374.8K installs, repository 131.3K stars. [Source](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/main/.claude/skills/ui-ux-pro-max) | Accessibility before decoration; >=44 pt targets; readable contrast; no emoji icons; <=5 bottom destinations; reduced motion; visible form labels. Using the published priority rules temporarily, not claiming a database-generated palette. The brief supplies the palette. |
| Vercel Web Design Guidelines | [skills.sh](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines): 677.6K installs, repository 31.7K stars. [Live rules](https://vercel.com/design/guidelines) | Keyboard and focus must work; loading retains context; errors offer recovery; preserve safe areas; animate transforms/opacity; never disable zoom. Adapt web semantics to native accessibility properties. |

Also consult [Apple tab-bar guidance](https://developer.apple.com/design/human-interface-guidelines/tab-bars): navigation remains predictable across screens. The brief explicitly asks for a raised center action, so it opens Ask, rather than pretending to be a fifth content library.

Native output stays React Native. Avoid a DOM-only demo that would require rebuilding for iOS. Voice uses an OS speech recognizer with typed fallback; haptics accompany selection/reveal, never replace visual feedback. See [motion](../design/motion.md) for the current orb rendering and web/native boundary.
