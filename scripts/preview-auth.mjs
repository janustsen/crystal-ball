import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
export const previewSecret=process.env.EXPO_PUBLIC_PREVIEW_SECRET||readFileSync('.local/preview-secret','utf8').trim();
export const httpCredentials={username:'preview',password:previewSecret};
export function previewFetch(url,init={}){return fetch(url,{...init,headers:{'x-preview-token':previewSecret,origin:new URL(url).origin,...init.headers}})}
export function openAuthenticatedPreview(base,env=process.env){
 const url=new URL(base);url.username='preview';url.password=previewSecret;
 // stdin keeps the credential out of process arguments; the script prints nothing.
 try{execFileSync('chrome-devtools-axi',['run'],{env,input:`await page.open(${JSON.stringify(url.href)});`,encoding:'utf8',timeout:90000,stdio:['pipe','pipe','pipe']})}catch{throw new Error('Preview browser authentication failed; credential withheld.')}
}
