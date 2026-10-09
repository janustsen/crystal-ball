import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const {adoptScene}=createRequire(import.meta.url)('../plugins/ios-scene.js');

test('ios-scene moves React Native startup from the template app delegate to the scene delegate',()=>{
 const template=execFileSync('tar',['-xzOf','node_modules/expo/template.tgz','package/ios/HelloWorld/AppDelegate.swift'],{encoding:'utf8'});
 const adopted=adoptScene(template);
 assert.match(adopted,/class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider \{/);
 assert.doesNotMatch(adopted,/startReactNative|UIScreen\.main\.bounds/);
 assert.match(adopted,/reactNativeFactory = factory/);
 assert.equal(adoptScene(adopted),adopted);
 assert.throws(()=>adoptScene('class Other {}'),/unexpected AppDelegate template/);
});
