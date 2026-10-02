# Round 33 — selected fonts and staged opening

Captain chose B: Fraunces headings, Manrope UI/body. The protected IM Fell English Italic wordmark is unchanged. Static TTF instances support the current Expo SDK 57 and are served locally. See assets/fonts/SELECTED.md for provenance and axes.

The forecast now opens through a short object sequence: compression and increasing wobble, growing seam light, one bounded glass separation/ring, then a rise and single settle. Golden editions lengthen charge by 250ms and use 12 rather than 8 embers. The forecast is already saved; Show forecast skips immediately, Close retains it in History, and History/Share returns do not replay it. App/system reduced motion replaces the sequence with a 180ms calm crossfade. Home's approach now says Come closer, reserving the actual opening for the result.

Reference footage, approximate beat measurements and adaptation limits: ../reveal-study/references.md. Before/after video: http://janus-mac.tail8d2280.ts.net:8098/concepts/reveal.html . Font comparison: http://janus-mac.tail8d2280.ts.net:8098/concepts/fonts.html . Original font prototypes are not production screenshots.

Preserved failures:
- home/: first selected-font Home captures. Manrope wrapped History at 200%, increasing the footer height; the decorative example question also wrapped at default size. Corrected with proportionate navigation widths (Home/History balance to keep Ask centered) and a smaller default top gap. Orb width and exact text scaling remain unchanged.
- font-baseline-partial/: early audit deliberately interrupted after the targeted Home failure, not a full audit pass.
- approach-marker-failure/: the initial audit/real-drive batch still expected the superseded approach copy. Updated both assertions to actual Come closer; no geometry/contrast threshold relaxed.
- opening-first-pass/: first animation drive passed behavior but visual inspection caught the wrapper shrinking buttons. The final wrapper explicitly lays out full-width content, keeps normal payoff text opaque, and leaves the stand unsplit.

Current proof is recorded separately from these failures. Browser and synthetic viewport checks are provisional; native Dynamic Type, physical keyboard, VoiceOver, haptics and device frame rate remain unverified. No predictive-accuracy claim is made.

Early-share regression: the first pointer checks waited for Playwright action stability and therefore missed the settling window (early-share-before and early-share-red are passing exploratory captures). Keyboard activation reproduced a replay immediately after returning from Share: expected0 opening overlays, received1. early-share-keyboard-before preserves the failing check/video; early-share-fixed passes after marking the forecast shown at payoff rather than only after settlement. The timer still finishes the visible animation and skip remains immediate.
