// iOS 27 asserts at launch unless an app built with its SDK adopts the UIScene life cycle, and Expo 57's prebuild
// template still starts React Native from the app delegate. This hands the window to Expo's ExpoAppSceneDelegate.
const {withAppDelegate,withInfoPlist}=require('expo/config-plugins');

module.exports=config=>withAppDelegate(withInfoPlist(config,plist=>{
 plist.modResults.UIApplicationSceneManifest={
  UIApplicationSupportsMultipleScenes:false,
  UISceneConfigurations:{UIWindowSceneSessionRoleApplication:[{UISceneConfigurationName:'Default Configuration',UISceneDelegateClassName:'EXExpoAppSceneDelegate'}]},
 };
 return plist;
}),delegate=>{
 const source=delegate.modResults.contents;
 const adopted=source
  .replace('class AppDelegate: ExpoAppDelegate {','class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
  .replace(/#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)[\s\S]*?#endif\n/,'');
 if(adopted===source||adopted.includes('window = UIWindow('))throw new Error('scene-lifecycle: AppDelegate template changed; update plugins/scene-lifecycle.js');
 delegate.modResults.contents=adopted;
 return delegate;
});
