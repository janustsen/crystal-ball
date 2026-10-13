import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {redactEvidence} from './redact-evidence.mjs';
export const previewSecret=process.env.EXPO_PUBLIC_PREVIEW_SECRET||readFileSync('.local/preview-secret','utf8').trim();
export const httpCredentials={username:'preview',password:previewSecret};
export function previewFetch(url,init={}){return fetch(url,{...init,headers:{'x-preview-token':previewSecret,origin:new URL(url).origin,...init.headers}})}
export function openAuthenticatedPreview(base,env=process.env){
 const url=new URL(base);url.username='';url.password='';
 // Page access is login-free; the client still supplies the engine request token.
 try{execFileSync('chrome-devtools-axi',['run'],{env,input:`await page.open(${JSON.stringify(url.href)});`,encoding:'utf8',timeout:90000,stdio:['pipe','pipe','pipe']})}catch(error){
  throw new Error(redactEvidence(`Preview browser open failed: ${error.message}\n${error.stdout||''}\n${error.stderr||''}`,previewSecret));
 }
}
