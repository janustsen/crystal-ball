import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
// Resolves the config Expo actually builds with, under the given engine URL.
const ats=(engine?:string)=>{
 const env:NodeJS.ProcessEnv={...process.env,EXPO_NO_DOTENV:'1'};delete env.EXPO_PUBLIC_ENGINE_URL;if(engine)env.EXPO_PUBLIC_ENGINE_URL=engine;
 return JSON.parse(execFileSync('npx',['expo','config','--json','--type','public'],{env,encoding:'utf8'})).ios.infoPlist.NSAppTransportSecurity;
};

test('only a tailnet-preview build gets an insecure-http ATS exception, for exactly that host',()=>{
 assert.deepEqual(ats(),{NSAllowsLocalNetworking:true});
 assert.deepEqual(ats('https://engine.example.com/engine'),{NSAllowsLocalNetworking:true});
 assert.deepEqual(ats('http://engine.example.com/engine'),{NSAllowsLocalNetworking:true});
 assert.deepEqual(ats('http://janus-mac.tail8d2280.ts.net:8087/engine'),{NSAllowsLocalNetworking:true,NSExceptionDomains:{'janus-mac.tail8d2280.ts.net':{NSExceptionAllowsInsecureHTTPLoads:true}}});
});
