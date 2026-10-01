import {readFileSync} from 'node:fs';
export const previewSecret=process.env.EXPO_PUBLIC_PREVIEW_SECRET||readFileSync('.local/preview-secret','utf8').trim();
export const httpCredentials={username:'preview',password:previewSecret};
export function previewFetch(url,init={}){return fetch(url,{...init,headers:{'x-preview-token':previewSecret,origin:new URL(url).origin,...init.headers}})}
export function authenticatedPreviewUrl(base){const url=new URL(base);url.username='preview';url.password=previewSecret;return url.href}
