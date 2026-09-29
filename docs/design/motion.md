# Motion authority

One glass object carries the visual identity. App transitions replace the screen; they do not claim a continuous shared-element animation. Implementation is in src/ui.tsx and app/index.tsx. No fictional progress or artificial delay holds a completed prediction.

| Interaction | Timing and visual | Reduced motion | Haptic |
|---|---|---|---|
| Idle glass | Scale .97→1.025→.97, 3.2 s each half, sine ease-in-out | Static | None |
| Idle mist | 25% layer opacity; 12 s rotation, linear | Static | None |
| Research | 45% mist layer, 6 s rotation; static 15% cyan core and rim | Static cyan phase | None |
| Home orb press | Scale 1→.94 in 120 ms, release in 180 ms | Immediate scale feedback | None |
| Raised tab orb | Static small glass, immediate navigation on press | Same | None |
| Card selection | Immediate cyan outline, ring and star | Same non-color marker | Selection |
| Screen/card/tab/overlay entry | 180 ms fade and 8 pt rise, cubic-out | Immediate | None |
| Research→reveal | Research rotation stops; gold rim and fixed five-point brand constellation appear; separate glow and text use timeline below | Final composition immediately | Success |
| Why | Immediate inline expansion/collapse, focus remains on toggle, expanded-state announcement | Same | None |
| Other | Field appears inline; web focus scrolls it into view | Same | None |
| Voice hold | Listening label while held; release stops recording | Same | None |
| Error/timeout | Standard content entry, plain recovery copy, no alarm flash | Immediate | None; recovery is not an alarm |
| Notice/reminder/outcome | In-layout polite status, explicit Dismiss, no movement | Same | None |
| Forget/Undo/reset | Immediate fact removal/restoration; whole reset confirms | Same | None |
| Export | Actual start/success/failure status only | Same | None |
| Story MP4 | Camera scale 1→1.05→1 over 4 s, 25 fps, sine curve | PNG alternative | None |

Cubic-out is 1−(1−t)^3; sine ease-in-out is (1−cos(πt))/2. Reduced motion removes automatic movement; direct press feedback becomes immediate. Microphone-specific orb choreography and native haptic feel require device validation and are not claimed implemented.

## Reveal timeline

| Offset | Event |
|---|---|
| 0 ms | Stop research mist, show gold rim and five-point reveal motif; separate reveal glow starts at opacity 0 |
| 200 ms | Headline and speculative label begin one 600 ms fade |
| 250 ms | Glow reaches .35, then declines over 450 ms |
| 700 ms | Glow is clear |
| 800 ms | Text is settled; no forced dwell or disabled actions |

Large text places the label before the headline for reading order. The question-progress constellation is a different component: actual card count, gold answered points, cyan current point. It never changes the five-point reveal motif.

Planning/research announce the real operation immediately, add longer-wait copy at 8 seconds and offer recoverable timeout at 60. Actions are never delayed for ceremony. The raised tab orb stays static to avoid competing motion. The share and paywall use the same short entry and explicit Back control.

## Evidence limits

review.html includes the actual flow recording, exported MP4 and 0/300/800 ms reveal capture offsets. The offsets start when the reveal control appears; they are not precise animation-keyframe proof. performance-flow.json separately measures headed browser frame intervals during real planning, research and reveal. Neither is native-device evidence. The accessible static alternatives are checked by the reduced-motion drive.
