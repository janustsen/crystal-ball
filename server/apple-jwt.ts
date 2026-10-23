type Env=(key:string)=>string|undefined;
const encoded=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const json=(value:unknown)=>encoded(new TextEncoder().encode(JSON.stringify(value)));
// Apple uses ES256 for both APNs auth and Sign in with Apple client secrets.
export async function appleJwt(env:Env,prefix:'APNS'|'APPLE',claims:Record<string,unknown>){
 const pem=env(`${prefix}_PRIVATE_KEY`),kid=env(`${prefix}_KEY_ID`);
 if(!pem||!kid)throw new Error('Apple credentials are not configured.');
 const der=Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g,'')),c=>c.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',der,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const payload=`${json({alg:'ES256',kid})}.${json(claims)}`;
 const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(payload));
 return `${payload}.${encoded(new Uint8Array(signature))}`;
}
