# Round 13 validation notes

Product candidate:76deb03. The later layout-harness commit adds two visible states; it does not alter the application.

- The first layout sweep used the old assumption that sources were always expanded. It failed when the new Current sources disclosure was closed. Its output remains in layout-before-harness-update/. The updated sweep opens and checks every original source; it adds explicit expanded-evidence and expanded-sharing states, increasing coverage from144 to156 combinations.
- The first task-specific contrast assertion accidentally expected a `pass` property from the shared helper; the helper returns measured `contrast` and `required`. The preserved failure is in task-contrast-harness-failure/. The159 measured comparisons themselves had zero contrast failures. The corrected assertion compares those numeric values and a fresh capture run is retained in task-contrast/.
- Actual video export is available on this host. The real drive includes a real MP4 download plus ffprobe format/geometry/duration checks; its separate HTTP500 recovery case remains labeled synthetic. Earlier grading packets that lacked real-video evidence remain unchanged.
- Physical iPhone Safari, native Dynamic Type, physical keyboard/safe-area behavior and VoiceOver/TalkBack remain unverified. Browser viewport and keyboard tests are not substitutes for those rubric requirements.

A screenshot raised a possible header-scroll concern. The targeted check did **not** reproduce displacement: Close is fully within the viewport at both text sizes, and the fresh capture shows it in place. Added that visibility assertion. No scroll implementation change was justified or made; the visual concern is not reported as a reproduced product defect.

## Superseded by main integration

Inbox004 arrived before the round13 graders finished. Firstmate directs a rebase onto current main, preserving its removal of video export and adaptive follow-ups/skippable onboarding. Stopped only this round's owned grader and recovery process trees before rebasing; partial grader logs remain as evidence, not a completed score. Memory drive had completed; the interrupted recovery drive is not a pass. Every gate and subsequent grading will use the rebased application. This packet describes the pre-rebase product only.

Firstmate also clarified that browser scores remain provisional until every screen reaches nine there; physical iPhone/VoiceOver verification will be arranged then. Continue local improvement without waiting for the physical pass. No native certificate is implied by a browser score.
