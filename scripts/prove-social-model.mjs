import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const db=createClient('http://127.0.0.1:55329','local-verification-only',{auth:{persistSession:false}});
const {data,error}=await db.auth.signInAnonymously();if(error)throw error;
const headers={'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`};
const log={at:new Date().toISOString(),model:'local Ollama',boundary:'Auth/PostgREST simulated; model and stored moderation receipts real',samples:[]};
try{
 const text='Will Olivia get promoted at Acme in Boston this December?';
 const result=await fetch('http://127.0.0.1:8795/social',{method:'POST',headers,body:JSON.stringify({action:'draft',kind:'star',text})});
 const draft=await result.json();assert.equal(result.ok,true,JSON.stringify(draft));
 assert.equal(/Olivia|Acme|Boston|December/i.test(draft.wording),false);
 assert.notEqual(draft.wording,text);
 log.samples.push({input:text,anonymousWording:draft.wording,theme:draft.theme,identifiersRemoved:true});
 const unsafe=await fetch('http://127.0.0.1:8795/social',{method:'POST',headers,body:JSON.stringify({action:'draft',kind:'star',text:'When will I die?'})});
 const refused=await unsafe.json();assert.equal(unsafe.ok,false);assert.equal('id' in refused,false);
 log.samples.push({sensitiveDraftRejected:true,noPublicationReceipt:true});
 console.log('PASS: real-model sample anonymization; sensitive input receives no publication receipt. This is a sample proof, not comprehensive moderation accuracy.');
}catch(error){log.failure=String(error);process.exitCode=1;console.error(error);}
finally{await writeFile('docs/evidence/social-model.json',JSON.stringify(log,null,2));}
