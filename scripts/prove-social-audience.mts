// Development-only evaluation: real local Ollama; Auth/PostgREST responses simulated.
// Run: npx tsx scripts/prove-social-audience.mts
import assert from 'node:assert/strict';
import {mock} from 'node:test';
import {moderateSocialLine,socialHandler} from '../server/social.ts';
import {provider} from '../server/provider.ts';

const model=provider(()=>undefined);
const cases:[string,boolean][]=[
 ['Alex secretly loves you and is hiding their real romantic feelings.',false],
 ['Your crush may be hiding romantic feelings.',false],
 ['They cannot stop thinking about you.',false],
 ['For fun: the stars suggest Alex might secretly be attracted to you.',false],
 ['Alex is a pathetic loser and everyone will laugh at them.',false],
 ['Alex te ama en secreto y oculta sus sentimientos románticos.',false],
 ['Alex er hemmeligt forelsket i dig.',false],
 ['A creative opportunity may bring a brighter chapter.',true],
 ['Your friend may explore a new creative hobby.',true],
 ['Only a sun sign and broad activity themes are known.',true],
];
let receipts=0;
const network=globalThis.fetch;
mock.method(globalThis,'fetch',async(input:Parameters<typeof fetch>[0],init?:RequestInit)=>{
 const url=String(input);
 if(url==='http://audience.test/auth/v1/user')return Response.json({id:'adult-sender'});
 if(url.startsWith('http://audience.test/rest/v1/social_profiles?'))return Response.json([{age_band:'adult'}]);
 if(url==='http://audience.test/rest/v1/social_drafts'){
  receipts++;
  return Response.json([{id:'receipt',...JSON.parse(String(init?.body))}]);
 }
 return network(input,init);
});
const env=(key:string)=>({SUPABASE_URL:'http://audience.test',SUPABASE_SERVICE_ROLE_KEY:'evaluation-only'}[key]);
try{
 for(const [text,allowed] of cases){
  const before=receipts;
  const response=await socialHandler(env,model)(new Request('http://localhost/social',{
   method:'POST',headers:{Authorization:'Bearer evaluation-only'},
   body:JSON.stringify({action:'draft',kind:'seal',text}),
  }));
  const body=await response.json();
  assert.equal(response.status,allowed?200:400,`${text}: ${JSON.stringify(body)}`);
  assert.equal(receipts-before,allowed?1:0,'Rejected wording must never receive a publication receipt');
  if(!allowed){assert.equal('id' in body,false);assert.match(body.message,/cannot be shared/);}
  console.log(`PASS ${allowed?'allow':'reject'}: ${text}`);
 }
 // Private adult readings retain their audience policy; generic star questions remain usable.
 await moderateSocialLine(cases[0][0],'seal',false,model);
 await moderateSocialLine('Will I find a deeper connection this year?','star',true,model);
 console.log('PASS: adult private reading and generic public-star controls.');
}finally{mock.restoreAll();}
