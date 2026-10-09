// iOS 27 traps at launch unless the app adopts the UIScene life cycle. Expo 57 ships the scene delegate
// (EXExpoAppSceneDelegate), but its prebuild template still starts React Native from the app delegate.
const {withAppDelegate,withInfoPlist}=require('expo/config-plugins');
const start=/\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)[\s\S]*?#endif\n/;
const header='class AppDelegate: ExpoAppDelegate {';
function adoptScene(contents){
 if(contents.includes('ExpoReactNativeFactoryProvider'))return contents;
 if(!contents.includes(header)||!start.test(contents))throw new Error('ios-scene: unexpected AppDelegate template; update plugins/ios-scene.js.');
 return contents.replace(header,'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {').replace(start,'\n');
}
const manifest={UIApplicationSupportsMultipleScenes:false,UISceneConfigurations:{UIWindowSceneSessionRoleApplication:[{UISceneConfigurationName:'Default Configuration',UISceneDelegateClassName:'EXExpoAppSceneDelegate'}]}};
module.exports=config=>withInfoPlist(withAppDelegate(config,c=>{c.modResults.contents=adoptScene(c.modResults.contents);return c}),c=>{c.modResults.UIApplicationSceneManifest=manifest;return c});
module.exports.adoptScene=adoptScene;
