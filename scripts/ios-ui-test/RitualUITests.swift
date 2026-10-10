import XCTest

// Drives the installed Release build in the iOS Simulator: onboarding, the Today card, a real forecast from the local
// engine, the notification offer and the iOS permission prompt, You's sky and counts, a local notification tap and a
// server push delivered by scripts/simulator-push.mts. Screenshots and handshake files go to RITUAL_OUT on the host.
final class RitualUITests: XCTestCase {
 let app=XCUIApplication(bundleIdentifier:"com.janustsen.crystalball")
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

 func testDailyRitualAndNotifications() throws {
  continueAfterFailure=false
  // A development build loads this checkout's JavaScript from Metro: the bundle location travels as user-default arguments.
  if let metro=ProcessInfo.processInfo.environment["RITUAL_METRO"]{app.launchArguments=["-RCT_jsLocation",metro,"-RCT_enableDev","NO","-RCT_enableMinification","YES"]}
  app.launch()
  let birthday=wait(element("onboarding-birthday"),30,"onboarding")
  birthday.tap();birthday.typeText("1995-06-15")
  tap("continue");tap("learning-growth");tap("meet-the-ball")
  _=reach("today-card",30)
  // Today's omen comes from the local model; the omen step finishes once it settles.
  XCTAssertTrue(wait(element("today-omen"),10,"omen step").waitForLabel("done",timeout:120),"omen step never finished")
  shot("01-home-today")
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
  XCTAssertTrue(reach("today-card").label.contains("2 of 2")||labelled("Today’s star",in:app).waitForExistence(timeout:10))
  shot("04-home-star")
  tap("tab-you");_=reach("your-sky");shot("05-you-sky")
  _=reach("notify-settings");shot("06-you-notifications")
  reach("you-footer").press(forDuration:1.2)
  _=reach("ritual-debug");shot("07-you-counts")
  tap("test-notification")
  XCUIDevice.shared.press(.home)
  let local=labelled("Your omen is waiting",in:springboard)
  XCTAssertTrue(local.waitForExistence(timeout:20),"local notification never arrived")
  shot("08-local-notification")
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
  shot("10-server-push")
  push.tap()
  XCTAssertTrue(app.wait(for:.runningForeground,timeout:10))
  let sky=wait(element("tab-sky"),10,"Sky tab")
  Thread.sleep(forTimeInterval:2)
  XCTAssertTrue(sky.isSelected,"server push did not open Sky")
  shot("11-after-push-tap")
 }
}
extension XCUIElement{
 func waitForLabel(_ text:String,timeout:Double)->Bool{let end=Date().addingTimeInterval(timeout);while Date()<end{if label.contains(text){return true};Thread.sleep(forTimeInterval:2)};return false}
}
