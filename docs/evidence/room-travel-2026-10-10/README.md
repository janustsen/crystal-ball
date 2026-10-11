# Room travel restored (2026-10-10)

Tab changes fly the camera through the library room again, on web and native, with the flight clips bundled.

- `web-tabs.mp4`: 390×844 headless Chrome against a preview **without** `EXPO_PUBLIC_ROOM_ASSET_BASE` (the default preview and phone-build condition). Home → Sky → History → You → Home → History → Sky → You → Home → Ask → Home; each change asserted a playing flight clip and its landing.
- `web-reduced-motion.mp4`: the same app with reduced motion; Sky, History, Home cross-fade the stills and play no flight.
- `drive-room.json`: `scripts/drive-room.mjs` with the temporary room route and streamed loops: all 20 ordered spot pairs play their bundled flight byte-for-byte and land on the destination loop; 25 clips prefetched; reduced-motion fade; golden halo on the Ask ball.
- `ios-sim-tabs.mp4`: Release build on the iPhone 18 Pro Max simulator (iOS 27), driven by an XCUITest through the same tab order, Ask and back, then the in-app Reduce motion setting with Sky, History, Home. Recorded on the build before the commit that re-applies the app's audio mode after each flight, which changes nothing visible; that final head also passed the same drive.

Native boundaries seen in the simulator, not device-verified:
- The live glass ball disappeared when drawn over a playing flight video, so the static orb rides the flight track and the glass ball returns on landing.
- After Ask's speech and microphone permission alerts, the room's glass ball stopped showing at Ask while its render loop kept running (logged), and every new glass scene (app launch, the tab bar's Ask orb after leaving Ask) blocked JavaScript for 12–51 s on the simulator's software GL. During that stall the Ask → Home flight holds the Ask still.
