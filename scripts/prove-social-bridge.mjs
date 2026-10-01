import {createClient} from '@supabase/supabase-js';
import {previewFetch} from './preview-auth.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const url='http://localhost:8095/engine/social',db=createClient('http://127.0.0.1:55329','local-verification-only',{auth:{persistSession:false}});
const {data,error}=await db.auth.signInAnonymously();if(error)throw error;
const body=JSON.stringify({action:'profile',ageBand:null,sunSign:null,plus:false}),proofs=[];
for(const [name,options,status] of [
 ['missing-preview-token',{method:'POST',headers:{'x-preview-token':'','Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body},401],
 ['missing-supabase-identity',{method:'POST',headers:{'Content-Type':'application/json'},body},401],
 ['authenticated',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body},200],
 // Localhost passes Expo's outer CORS layer, so this exercises our host/port check.
 ['foreign-origin',{method:'POST',headers:{origin:'http://localhost:9999'},body},403],
 ['wrong-method',{method:'GET'},405]
]){const response=await previewFetch(url,options);assert.equal(response.status,status,name);proofs.push({name,status:response.status})}
await writeFile('docs/evidence/social-bridge.json',JSON.stringify({boundary:'Real Metro/engine bridge; synthetic local Auth account',proofs,earlierProbe:'elsewhere.invalid rejected with HTTP500 by Expo CorsMiddleware before reaching bridge; localhost:9999 exercises the bridge itself'},null,2));
console.log('PASS: authenticated bridge forwards identity; missing identity, foreign origin and wrong method rejected');
