export const missingWebOrigin='Configure the Crystal Ball web origin before sharing a link.';
// Shared links open the web app, so someone without Crystal Ball can still follow one (and gets one free web reading).
export function webLink(params:Record<string,string>,origin=process.env.EXPO_PUBLIC_WEB_ORIGIN,development=typeof __DEV__!=='undefined'&&__DEV__):string{
 // On the web the page is already the web app, so its own origin is the fallback (native has no location).
 const page=typeof location!=='undefined'&&/^https?:/.test(location.origin??'')?location.origin:'';
 const base=origin||page;
 if(!base)throw new Error(missingWebOrigin);
 const url=new URL(base);
 if((url.protocol!=='https:'&&!((development||!origin)&&url.protocol==='http:'))||url.username||url.password)throw new Error('Shared links require an HTTPS web origin.');
 const link=new URL('/',url.origin);
 for(const [key,value] of Object.entries(params))link.searchParams.set(key,value);
 return link.href;
}
export const sealedLink=(token:string,origin?:string,development?:boolean)=>webLink({seal:token},origin,development);
// The address printed on story cards; empty when no web origin is configured.
export function webAddress(origin?:string,development?:boolean):string{
 try{return new URL(webLink({},origin,development)).host}catch{return ''}
}
