// Install locally: npm install --prefix .local/pg-proof --no-save --package-lock=false @electric-sql/pglite
import {PGlite} from '../.local/pg-proof/node_modules/@electric-sql/pglite/dist/index.js';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
try{
 await db.exec(`create schema auth;create role authenticated;grant usage on schema auth to authenticated;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select current_setting('request.jwt.claim.sub',true)::uuid $$;
 insert into auth.users values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');`);
 await db.exec(await readFile('supabase/migrations/202609290001_local_memory.sql','utf8'));
 await db.exec(await readFile('supabase/migrations/202609300001_backup_ownership.sql','utf8'));
 const a='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',b='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',id='cccccccc-cccc-cccc-cccc-cccccccccccc';
 await db.exec(`set role authenticated;set request.jwt.claim.sub='${a}';`);
 await db.query('insert into public.predictions(id,user_id,payload,created_at) values($1,$2,$3,now())',[id,a,{headline:'A'}]);
 await db.exec(`set request.jwt.claim.sub='${b}';`);
 assert.equal((await db.query('select * from public.predictions')).rows.length,0);
 await assert.rejects(db.query('insert into public.predictions(id,user_id,payload,created_at) values($1,$2,$3,now()) on conflict(user_id,id) do update set payload=excluded.payload',[id,a,{headline:'attack'}]));
 await db.query('insert into public.predictions(id,user_id,payload,created_at) values($1,$2,$3,now()) on conflict(user_id,id) do update set payload=excluded.payload',[id,b,{headline:'B copy'}]);
 assert.equal((await db.query('select * from public.predictions')).rows.length,1);
 await db.exec(`delete from public.predictions;set request.jwt.claim.sub='${a}';`);
 assert.equal((await db.query('select payload from public.predictions')).rows[0].payload.headline,'A');
 const report={at:new Date().toISOString(),runtime:'isolated PGlite PostgreSQL; production migrations; auth.uid bound to synthetic test JWT subject',sameReadingCanBelongToTwoOwners:true,crossOwnerReadHidden:true,crossOwnerUpsertRejected:true,deleteOnlyTouchesCurrentOwner:true};
 await writeFile('docs/evidence/launch-backup-rls.json',JSON.stringify(report,null,2));console.log(report);
}finally{await db.close()}
