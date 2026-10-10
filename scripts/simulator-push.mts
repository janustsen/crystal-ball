import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {apnsPayload,deliverSocialPushes} from '../server/social-push.ts';
// Server push without the paid Apple account: the real delivery job, handed to an iOS Simulator instead of Expo's push service.
// Usage: npx tsx scripts/simulator-push.mts <simulator-udid|booted> [sky|seal|invite|joined|forecast|vote ...]
const [device='booted',...requested]=process.argv.slice(2),kinds=requested.length?requested:['sky','seal'];
const bundle=process.env.IOS_BUNDLE_ID||'com.janustsen.crystalball';
const env=(key:string)=>({SUPABASE_URL:'http://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture'} as Record<string,string>)[key];
const dir=mkdtempSync(join(tmpdir(),'cb-push-')),job=(kind:string,i:number)=>({id:`fixture-${i}`,token:'ExpoPushToken[simulator]',kind,circle_id:null});
const transport:typeof fetch=async(input,init)=>{
 const url=String(input);
 if(url==='https://exp.host/--/api/v2/push/send'){
  const file=join(dir,`${Date.now()}.apns`),payload=apnsPayload(JSON.parse(String(init?.body)));
  writeFileSync(file,JSON.stringify(payload));execFileSync('xcrun',['simctl','push',device,bundle,file]);
  console.log('pushed',JSON.stringify(payload));
  return Response.json({data:{status:'ok'}});
 }
 if(url.endsWith('claim_social_pushes'))return Response.json(kinds.filter(kind=>kind!=='sky').map(job));
 if(url.endsWith('claim_sky_pushes'))return Response.json(kinds.filter(kind=>kind==='sky').map(job));
 return Response.json(null);
};
console.log(await deliverSocialPushes(env,transport));
