import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const code=ts.transpileModule(readFileSync(new URL('../src/SocialPush.tsx',import.meta.url),'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true},
}).outputText;
function fixture(platform='ios',initialLocalSky=false){
 const account={answered:false,enabled:false,token:null as string|null,circle:false};
 let local:any={ritual:{notify:{sky:initialLocalSky}}};
 const calls:string[]=[];
 let slots:any[]=[],cursor=0,permission='granted',tokenFails=false,saveFails=false;
 const react={
  createElement:(type:any,props:any,...children:any[])=>({type,props:props??{},children}),
  useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(value:any)=>{slots[i]=value}]},
 };
 const setSkyPush=async(enabled:boolean,token?:string)=>{calls.push(token?`sky:${enabled}:${token}`:`sky:${enabled}`);if(saveFails)throw new Error('Save failed');account.answered=true;account.enabled=enabled;if(token)account.token=token;};
 const imports:Record<string,any>={
  react,'react-native':{Platform:{OS:platform},View:'View',Switch:'Switch'},
  './Surface':{Surface:'Surface'},'./ui':{Action:'Action',Txt:'Txt',styles:{row:{}}},
  'expo-constants':{expoConfig:{extra:{eas:{projectId:'test-project'}}}},
  'expo-notifications':{
   requestPermissionsAsync:async()=>{calls.push('permission');return {status:permission}},
   getExpoPushTokenAsync:async()=>{calls.push('token');if(tokenFails)throw new Error('Token failed');return {data:'test-token'}},
   setNotificationChannelAsync:async()=>{calls.push('channel')},AndroidImportance:{DEFAULT:3},
  },
  './store':{useStore:()=>({state:local,update:(fn:(s:any)=>any)=>{local=fn(local)}})},
  './ritual':{ritualOf:(s:any)=>({notify:{},...s.ritual})},
  './notify':{allowNotifications:async()=>{calls.push('local-permission');return permission==='granted'}},
  './social':{setSkyPush,setSocialPush:async(token:string|null)=>{calls.push(token?'save-token':'circle-off');if(token)account.token=token;account.circle=token!==null}},
 };
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>imports[name],Error});
 const nodes=(node:any):any[]=>!node||typeof node!=='object'?[]:[node,...node.children.flatMap(nodes)];
 const render=(settings=false)=>{cursor=0;return nodes(settings?module.exports.SocialPush({skyPush:account.enabled,onSkyPush:setSkyPush}):module.exports.SkyPushPrompt({answered:account.answered,onAnswered:(enabled:boolean)=>{calls.push(`answered:${enabled}`)}}))};
 return {account,calls,render,localSky:()=>!!local.ritual?.notify.sky,remount:()=>{slots=[]},deny:()=>{permission='denied'},failToken:()=>{tokenFails=true},failSave:()=>{saveFails=true}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const control=(f:ReturnType<typeof fixture>,id:string)=>f.render().find(n=>n.props.testID===id);

test('Sky prompt is native-only and acceptance registers before opting in',async()=>{
 assert.deepEqual(fixture('web').render(),[]);
 const f=fixture();
 assert.ok(control(f,'sky-push-prompt'));
 control(f,'sky-push-accept').props.onPress();await settle();
 assert.deepEqual(f.calls,['sky:false','answered:false','local-permission','permission','token','sky:true:test-token','answered:true']);
 assert.equal(f.localSky(),true);
 assert.deepEqual(f.account,{answered:true,enabled:true,token:'test-token',circle:false});
 f.remount();assert.equal(control(f,'sky-push-prompt'),undefined);
});

test('dismissal survives remount without requesting permissions or registering',async()=>{
 const f=fixture('ios',true);control(f,'sky-push-dismiss').props.onPress();await settle();
 assert.deepEqual(f.calls,['sky:false','answered:false']);assert.equal(f.account.enabled,false);assert.equal(f.localSky(),false);
 f.remount();assert.equal(control(f,'sky-push-prompt'),undefined);
});

test('denied permission keeps an accepted prompt answered with Sky off on the server and the phone',async()=>{
 const f=fixture();f.deny();control(f,'sky-push-accept').props.onPress();await settle();
 assert.equal(f.account.answered,true);assert.equal(f.account.enabled,false);assert.equal(f.localSky(),false);
 assert.ok(!f.calls.includes('token'));
 assert.ok(f.render().some(n=>n.children.some((text:any)=>typeof text==='string'&&text.includes('You can change Friday Sky notifications in Circles.'))));
 f.remount();assert.equal(control(f,'sky-push-prompt'),undefined);
});

test('a failed push registration keeps the phone’s own Friday notification',async()=>{
 const f=fixture();f.failToken();control(f,'sky-push-accept').props.onPress();await settle();
 assert.equal(f.account.answered,true);assert.equal(f.account.enabled,false);assert.equal(f.localSky(),true);
 assert.ok(f.render().some(n=>n.children.some((text:any)=>text==='Friday Sky notifications enabled.')));
 f.remount();assert.equal(control(f,'sky-push-prompt'),undefined);
});

test('a failed answer save does not request permission or silently dismiss',async()=>{
 const f=fixture();f.failSave();control(f,'sky-push-accept').props.onPress();await settle();
 assert.deepEqual(f.calls,['sky:false']);assert.ok(control(f,'sky-push-prompt'));
 assert.equal(f.account.enabled,false);
});

test('settings default off, allow later opt-in and opt-out, and Circle enable never opts into Sky',async()=>{
 const f=fixture('android');
 const toggle=()=>f.render(true).find(n=>n.props.testID==='sky-push-toggle');
 assert.equal(toggle().props.value,false);
 f.render(true).find(n=>n.props.label==='Enable Circle notifications').props.onPress();await settle();
 assert.equal(f.account.enabled,false);assert.equal(f.account.answered,false);
 f.calls.length=0;toggle().props.onValueChange(true);await settle();
 assert.deepEqual(f.calls,['local-permission','channel','permission','token','sky:true:test-token']);assert.equal(f.localSky(),true);
 assert.equal(toggle().props.value,true);
 assert.equal(f.account.circle,true);
 f.render(true).find(n=>n.props.label==='Turn off Circle notifications').props.onPress();await settle();
 assert.equal(f.account.circle,false);assert.equal(f.account.enabled,true);assert.equal(toggle().props.value,true);
 f.calls.length=0;toggle().props.onValueChange(false);await settle();
 assert.deepEqual(f.calls,['sky:false']);assert.equal(toggle().props.value,false);assert.equal(f.localSky(),false);
 f.remount();assert.equal(control(f,'sky-push-prompt'),undefined);
});

test('the Sky toggle falls back to the phone when this build cannot register a push',async()=>{
 const f=fixture();f.failToken();
 const toggle=()=>f.render(true).find(n=>n.props.testID==='sky-push-toggle');
 toggle().props.onValueChange(true);await settle();
 assert.ok(!f.calls.some(c=>c.startsWith('sky:true')));assert.equal(f.localSky(),true);assert.equal(toggle().props.value,true);
 assert.ok(f.render(true).some(n=>n.children.some((text:any)=>text==='Friday Sky notifications will come from this phone.')));
 assert.equal(f.account.answered,true);
 f.remount();assert.equal(control(f,'sky-push-prompt'),undefined);
 f.remount();
 toggle().props.onValueChange(false);await settle();
 assert.equal(f.localSky(),false);assert.equal(toggle().props.value,false);
});
