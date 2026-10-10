import test from 'node:test';
import assert from 'node:assert/strict';
import {apnsPayload,pushMessage,deliverSocialPushes} from '../server/social-push';
test('a queued push becomes the APNs payload expo-notifications routes, with no private text',()=>{
 const sky=apnsPayload(pushMessage({id:'1',token:'ExpoPushToken[x]',kind:'sky',circle_id:null}));
 assert.deepEqual(sky,{aps:{alert:{title:'Crystal Ball',body:'The Sky is open.'},sound:'default'},body:{social:true,sky:true}});
 const seal=apnsPayload(pushMessage({id:'2',token:'ExpoPushToken[x]',kind:'seal',circle_id:'c1'}));
 assert.deepEqual(seal.body,{social:true,circle:'c1'});assert.equal(seal.aps.alert.body,'Someone sealed a forecast for you.');
});


import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
test('Simulator CLI uses only fixture jobs even with production credentials present',async()=>{
 const files=new Map<string,string>(),pushes:string[][]=[],results:any[]=[];
 const imports:Record<string,unknown>={
  'node:child_process':{execFileSync:(bin:string,args:string[])=>{assert.equal(bin,'xcrun');pushes.push(args)}},
  'node:fs':{mkdtempSync:()=>'/fixture',writeFileSync:(path:string,data:string)=>{files.set(path,data)}},
  'node:os':{tmpdir:()=>'/fixture'},'node:path':{join:(...parts:string[])=>parts.join('/')},
  '../server/social-push.ts':{apnsPayload,deliverSocialPushes},
 };
 const code=ts.transpileModule(readFileSync(new URL('../scripts/simulator-push.mts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 await runInNewContext(`(async()=>{${code}})()`,{exports:{},require:(name:string)=>imports[name],Response,
  process:{argv:['node','script','simulator','sky','seal'],env:{SUPABASE_URL:'https://production.invalid',SUPABASE_SERVICE_ROLE_KEY:'secret',EXPO_ACCESS_TOKEN:'secret'}},
  fetch:()=>{assert.fail('Simulator proof must not contact the network')},console:{log:(...args:any[])=>results.push(args)},
 });
 assert.equal(pushes.length,2);assert.ok(pushes.every(args=>args[0]==='simctl'&&args[1]==='push'&&args[2]==='simulator'));
 assert.ok([...files.values()].every(value=>JSON.parse(value).aps.alert.title==='Crystal Ball'));
 assert.deepEqual(results.at(-1),[{queued:2,accepted:2}]);
});
