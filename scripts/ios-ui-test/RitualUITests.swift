import XCTest

// Drives the installed Release build in the iOS Simulator: onboarding, the ladder opened, the Today card on You, a real forecast from the local
// engine, the notification offer and the iOS permission prompt, You's sky and counts, a local notification tap and a
// server push delivered by scripts/simulator-push.mts. Screenshots and handshake files go to RITUAL_OUT on the host.
final class RitualUITests: XCTestCase {
 let app=XCUIApplication(bundleIdentifier:ProcessInfo.processInfo.environment["CB_QA_BUNDLE_ID"] ?? "com.janustsen.crystalball")
 let springboard=XCUIApplication(bundleIdentifier:"com.apple.springboard")
 let out=ProcessInfo.processInfo.environment["RITUAL_OUT"] ?? "/tmp"

 func shot(_ name:String){try? XCUIScreen.main.screenshot().pngRepresentation.write(to:URL(fileURLWithPath:"\(out)/\(name).png"))}
 func element(_ id:String)->XCUIElement{app.descendants(matching:.any).matching(identifier:id).firstMatch}
 func labelled(_ text:String,in root:XCUIApplication)->XCUIElement{root.descendants(matching:.any).matching(NSPredicate(format:"label CONTAINS %@",text)).firstMatch}
 func wait(_ e:XCUIElement,_ seconds:Double=20,_ what:String)->XCUIElement{XCTAssertTrue(e.waitForExistence(timeout:seconds),"missing \(what)");return e}
 // Scrolls the screen's content until the element can be tapped.
 func reach(_ id:String,_ seconds:Double=20)->XCUIElement{
  let e=wait(element(id),seconds,id)
  for _ in 0..<8 where !e.isHittable{app.swipeUp(velocity:.slow)}
  return e
 }
 func tap(_ id:String,_ seconds:Double=20){reach(id,seconds).tap()}
 func allowAlert(_ button:String){let b=springboard.alerts.buttons[button];if b.waitForExistence(timeout:8){b.tap()}}
 func waitForFile(_ name:String,_ seconds:Double){let end=Date().addingTimeInterval(seconds);while Date()<end && !FileManager.default.fileExists(atPath:"\(out)/\(name)"){Thread.sleep(forTimeInterval:1)}}
 // A new account starts on the question ladder. After onboarding, run.sh opens every feature in the app's saved
 // state (as for an account past its 20 starter questions) while the app is closed, then the app relaunches on Home.
 func seedLadder(){
  _=wait(element("tap-to-ask"),60,"Home after onboarding");Thread.sleep(forTimeInterval:3)
  app.terminate();FileManager.default.createFile(atPath:"\(out)/ready-for-ladder",contents:nil)
  waitForFile("ladder-seeded",60);XCTAssertTrue(FileManager.default.fileExists(atPath:"\(out)/ladder-seeded"),"ladder never seeded")
  app.launch();_=wait(element("tab-you"),240,"You tab after seeding")
 }

 // Immediate local first card and the remaining loading state in a real installed build.
 // This case needs no ladder/storage seeder or mocked engine reply.
 func testImmediateOpeningAndLoading() throws {
  continueAfterFailure=false
  app.launch()
  if element("skip-for-now").waitForExistence(timeout:60){
   tap("skip-for-now");tap("confirm-age");tap("about-done")
  }
  _=wait(element("tap-to-ask"),60,"Home");shot("opening-01-home")
  tap("tap-to-ask");allowAlert("Don’t Allow");allowAlert("Don’t Allow")
  tap("type-instead",30)
  let question=wait(element("question-input"),20,"question field")
  question.tap();question.typeText("Will I finish my painting project this month?")
  shot("opening-02-typed")
  let start=Date();tap("look-into-the-future")
  _=wait(element("option-0"),9,"immediate first card")
  let elapsed=Date().timeIntervalSince(start)
  try JSONSerialization.data(withJSONObject:["firstCardSecondsIncludingXCTestTap":elapsed]).write(to:URL(fileURLWithPath:"\(out)/opening-timing.json"))
  XCTAssertLessThan(elapsed,10,"first card waited for model planning")
  shot("opening-03-card")
  tap("option-0")
  _=wait(labelled("The mist is gathering",in:app),15,"forecast loading")
  shot("opening-04-thinking");Thread.sleep(forTimeInterval:1.5);shot("opening-05-thinking")
  let cancel=app.buttons["Cancel"].firstMatch
  _=wait(cancel,5,"Cancel");cancel.tap()
  _=wait(element("question-input"),15,"typed question after Cancel")
  shot("opening-06-canceled")
  tap("close-flow");tap("open-settings")
  let reduce=app.switches["Reduce motion"]
  _=wait(reduce,10,"Reduce motion");reduce.tap();shot("opening-07-reduced-motion")
 }

 func testDailyRitualAndNotifications() throws {
  continueAfterFailure=false
  // A development build loads this checkout's JavaScript from Metro: the bundle location travels as user-default arguments.
  if let metro=ProcessInfo.processInfo.environment["RITUAL_METRO"]{app.launchArguments=["-RCT_jsLocation",metro,"-RCT_enableDev","NO","-RCT_enableMinification","YES"]}
  app.launch()
  // The birthday sheet's month, day and year fields, then every ladder feature open.
  _=wait(element("birthday-month"),30,"birthday sheet")
  for (id,value) in [("birthday-month","6"),("birthday-day","15"),("birthday-year","1995")]{let field=element(id);field.tap();field.typeText(value)}
  tap("continue");tap("about-done");seedLadder()
  // Today's omen comes from the local model on Home's insight line; the Today card on You marks it done once it settles.
  XCTAssertTrue(wait(element("insight-line"),30,"insight line").waitForLabelWithout(["starlight is finding you","stars are gathering"],timeout:120),"omen never settled")
  tap("tab-you");_=reach("today-card",30)
  XCTAssertTrue(wait(element("today-omen"),10,"omen step").waitForLabel("done",timeout:20),"omen step never finished")
  element("today-card").swipeUp(velocity:.slow);shot("01-home-today")
  tap("today-ask")
  allowAlert("Don’t Allow");allowAlert("Don’t Allow")
  tap("type-instead",30)
  let question=wait(element("question-input"),20,"question field");question.tap();question.typeText("Will I finish writing my novel this year?")
  tap("look-into-the-future")
  for _ in 0..<4{
   let option=element("option-0"),done=element("share-this-glimpse")
   let end=Date().addingTimeInterval(120)
   while Date()<end && !option.exists && !done.exists{Thread.sleep(forTimeInterval:1)}
   if done.exists{break}
   option.tap();Thread.sleep(forTimeInterval:1)
  }
  _=reach("notify-offer",120)
  _=reach("notify-yes")
  shot("02-reveal-notify-offer")
  tap("notify-yes")
  let allow=springboard.alerts.buttons["Allow"]
  XCTAssertTrue(allow.waitForExistence(timeout:10),"iOS never asked for notification permission")
  shot("03-ios-permission")
  allow.tap()
  while element("close-flow").exists{element("close-flow").tap();Thread.sleep(forTimeInterval:1)}
  tap("tab-you");tap("today-questions")
  for _ in 0..<3{tap("ask-option-0");Thread.sleep(forTimeInterval:1)}
  tap("tab-you")
  XCTAssertTrue(reach("today-card").label.contains("3 of 3")||labelled("Today’s star",in:app).waitForExistence(timeout:10))
  element("today-card").swipeUp(velocity:.slow);shot("04-home-star")
  _=reach("your-sky");shot("05-you-sky")
  tap("open-settings");_=reach("notify-settings");shot("06-settings-notifications")
  reach("you-footer").press(forDuration:1.2)
  _=reach("ritual-debug");shot("07-you-counts")
  tap("test-notification")
  XCUIDevice.shared.press(.home)
  let local=labelled("Your omen is waiting",in:springboard)
  XCTAssertTrue(local.waitForExistence(timeout:70),"local notification never arrived")
  Thread.sleep(forTimeInterval:1.5);shot("08-local-notification")
  local.tap()
  XCTAssertTrue(app.wait(for:.runningForeground,timeout:10))
  _=wait(element("tab-home"),10,"Home after tap")
  shot("09-after-local-tap")
  // Server push: the host script runs the real delivery job into this Simulator once the app is in the background.
  XCUIDevice.shared.press(.home)
  FileManager.default.createFile(atPath:"\(out)/ready-for-push",contents:nil)
  waitForFile("pushed",60)
  let push=labelled("The Sky is open",in:springboard)
  XCTAssertTrue(push.waitForExistence(timeout:30),"server push never arrived")
  Thread.sleep(forTimeInterval:1.5);shot("10-server-push")
  push.tap()
  XCTAssertTrue(app.wait(for:.runningForeground,timeout:10))
  // Sky is a screen off Home now, not a tab: the push lands on it.
  XCTAssertTrue(element("social-section-sky").waitForExistence(timeout:10),"server push did not open Sky")
  Thread.sleep(forTimeInterval:2)
  shot("11-after-push-tap")
 }

 // The Friday Sky fallback: a build without server push keeps Friday's 8pm notification on the phone.
 // Run alone with -only-testing:RitualUITests/RitualUITests/testFridaySkyFallback; it needs no model or social backend.
 func testFridaySkyFallback() throws {
  continueAfterFailure=false
  if let metro=ProcessInfo.processInfo.environment["RITUAL_METRO"],!metro.isEmpty{app.launchArguments=["-RCT_jsLocation",metro,"-RCT_enableDev","NO","-RCT_enableMinification","YES"]}
  // The plan assertion reads "Fri" and "8:00", so pin an English 12-hour clock whatever the Simulator's settings.
  app.launchArguments+=["-AppleLanguages","(en)","-AppleLocale","en_US","-AppleICUForce24HourTime","NO"]
  app.launch()
  _=wait(element("birthday-month"),240,"birthday sheet")
  // Each complete birthday field hands focus to the next, so type straight through.
  element("birthday-month").tap()
  for part in ["06","15","1995"]{app.typeText(part);Thread.sleep(forTimeInterval:1.5)}
  let done=app.buttons["Done"];if done.exists{done.tap()}
  let next=app.buttons["Continue"].firstMatch;if next.waitForExistence(timeout:3)&&next.isHittable{next.tap()}
  tap("about-done",60);seedLadder()
  tap("open-sky",60);tap("social-section-circles",60)
  tap("sky-push-toggle",60)
  // iOS asks once per install; a Simulator that already granted it skips the prompt.
  let allow=springboard.alerts.buttons["Allow"];if allow.waitForExistence(timeout:30){allow.tap()}
  let notice=labelled("Friday Sky notifications will come from this phone",in:app)
  XCTAssertTrue(notice.waitForExistence(timeout:60),"no on-phone fallback notice")
  XCTAssertEqual(element("sky-push-toggle").value as? String,"1","the Sky toggle should stay on")
  for _ in 0..<6 where !notice.isHittable{app.swipeUp(velocity:.slow)}
  Thread.sleep(forTimeInterval:1);shot("sky-01-circles-fallback")
  tap("tab-you",60);tap("open-settings",60);reach("you-footer",60).press(forDuration:1.2)
  _=reach("ritual-debug",60)
  let planned=labelled("The Sky is open",in:app)
  let weekday=Calendar(identifier:.gregorian).component(.weekday,from:Date())
  let expectsFriday=weekday != 2 && weekday != 7
  XCTAssertEqual(planned.waitForExistence(timeout:60),expectsFriday,"Friday fallback must follow back-off for weekday \(weekday)")
  if expectsFriday{
   XCTAssertTrue(planned.label.contains("Fri")&&planned.label.contains("8:00"),"fallback not planned for Friday 8pm: \(planned.label)")
   for _ in 0..<8 where !planned.isHittable{app.swipeUp(velocity:.slow)}
  }
  shot("sky-02-planned-friday")
  tap("tab-home",60);tap("open-sky",60);tap("social-section-circles",60)
  tap("sky-push-toggle",60)
  XCTAssertEqual(element("sky-push-toggle").value as? String,"0")
  // Let queued archive writes finish before terminating the process.
  Thread.sleep(forTimeInterval:5)
  app.terminate();app.launch()
  let homeTab=wait(element("tab-home"),240,"Home tab after relaunch")
  let ready=XCTNSPredicateExpectation(predicate:NSPredicate(format:"enabled == true"),object:homeTab)
  XCTAssertEqual(XCTWaiter.wait(for:[ready],timeout:240),.completed)
  tap("open-sky",60);tap("social-section-circles",60)
  XCTAssertEqual(element("sky-push-toggle").value as? String,"0","disabled consent must survive relaunch")
  shot("sky-03-disabled-after-relaunch")
  tap("tab-you",60);tap("open-settings",60);reach("you-footer",60).press(forDuration:1.2)
  _=reach("ritual-debug",60)
  XCTAssertFalse(labelled("The Sky is open",in:app).exists,"disabled fallback must leave the plan")
  shot("sky-04-disabled-plan")
 }
}
extension XCUIElement{
 func waitForLabel(_ text:String,timeout:Double)->Bool{let end=Date().addingTimeInterval(timeout);while Date()<end{if label.contains(text){return true};Thread.sleep(forTimeInterval:2)};return false}
 func waitForLabelWithout(_ texts:[String],timeout:Double)->Bool{let end=Date().addingTimeInterval(timeout);while Date()<end{if !label.isEmpty && !texts.contains(where:{label.contains($0)}){return true};Thread.sleep(forTimeInterval:2)};return false}
}
