// One free reading for browser visitors who arrive by a sealed link. Shared by the client and the server.
export const webReadingUsed='Your free web reading is used. Install Crystal Ball to ask more.';
export const webNetworkUsed='This network has used its free web reading today. Try another network or return tomorrow, or install Crystal Ball to ask more.';
export const webReadingsResting='The Ball has answered all its web visitors today. Install Crystal Ball to ask now.';
export const installMessages=[webReadingUsed,webNetworkUsed,webReadingsResting];
// Light bot check: a nonce whose SHA-256 starts with this many zero bits (~65k hashes).
export const proofBits=16;
export type WebReading={browser:string;day:string;nonce:string};

// Pure-JS SHA-256: crypto.subtle is missing on plain-HTTP preview origins and is async.
const primes:number[]=[];for(let n=2;primes.length<64;n++)if(primes.every(p=>n%p))primes.push(n);
const word=(x:number)=>(x-Math.floor(x))*2**32>>>0;
const K=primes.map(p=>word(Math.cbrt(p))),H=primes.slice(0,8).map(p=>word(Math.sqrt(p)));
export function sha256(text:string):string{
 const bytes=[...new TextEncoder().encode(text)],bits=bytes.length*8;
 bytes.push(0x80);while(bytes.length%64!==56)bytes.push(0);
 for(let i=7;i>=0;i--)bytes.push(i>3?0:bits>>>(i*8)&255);
 const h=[...H],w=new Array<number>(64),r=(x:number,n:number)=>x>>>n|x<<(32-n);
 for(let o=0;o<bytes.length;o+=64){
  for(let i=0;i<64;i++)w[i]=i<16?bytes[o+i*4]<<24|bytes[o+i*4+1]<<16|bytes[o+i*4+2]<<8|bytes[o+i*4+3]:(w[i-16]+(r(w[i-15],7)^r(w[i-15],18)^w[i-15]>>>3)+w[i-7]+(r(w[i-2],17)^r(w[i-2],19)^w[i-2]>>>10))|0;
  let [a,b,c,d,e,f,g,k]=h;
  for(let i=0;i<64;i++){
   const t1=k+(r(e,6)^r(e,11)^r(e,25))+(e&f^~e&g)+K[i]+w[i]|0,t2=(r(a,2)^r(a,13)^r(a,22))+(a&b^a&c^b&c)|0;
   k=g;g=f;f=e;e=d+t1|0;d=c;c=b;b=a;a=t1+t2|0;
  }
  [a,b,c,d,e,f,g,k].forEach((v,i)=>h[i]=h[i]+v|0);
 }
 return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
export const validProof=({browser,day,nonce}:WebReading,bits=proofBits)=>parseInt(sha256(`${browser}:${day}:${nonce}`).slice(0,8),16)>>>(32-bits)===0;
// Yields to the event loop so the thinking animation keeps running while the browser solves the check.
export async function solveProof(browser:string,day=new Date().toISOString().slice(0,10)):Promise<WebReading>{
 for(let n=0;;n++){
  const proof={browser,day,nonce:n.toString(36)};
  if(validProof(proof))return proof;
  if(n%2000===1999)await new Promise(resolve=>setTimeout(resolve));
 }
}
