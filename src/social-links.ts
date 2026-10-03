export function sealedLink(token:string,origin=process.env.EXPO_PUBLIC_WEB_ORIGIN,development=typeof __DEV__!=='undefined'&&__DEV__):string{
 const base=origin||(development&&typeof location!=='undefined'?location.origin:'');
 if(!base)throw new Error('Configure the Crystal Ball web origin before sharing a sealed link.');
 const url=new URL(base);
 if((url.protocol!=='https:'&&!(development&&url.protocol==='http:'))||url.username||url.password)throw new Error('Sealed links require an HTTPS web origin.');
 const link=new URL('/',url.origin);
 link.searchParams.set('seal',token);
 return link.href;
}
