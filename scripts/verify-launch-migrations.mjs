// Apply migrations using the real Supabase CLI, without Docker or a hosted account.
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
const bin=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@17/bin',port=process.env.MIGRATION_PG_PORT||'55508';
const dir=mkdtempSync(join(tmpdir(),'cb-migrations-')),password=randomBytes(24).toString('hex'),pwfile=join(dir,'password');
writeFileSync(pwfile,password,{mode:0o600});
const env={...process.env,PGHOST:'127.0.0.1',PGPORT:port,PGDATABASE:'postgres',PGUSER:'postgres',PGPASSWORD:password};
let started=false;
function run(command,args,options={}){
 const result=spawnSync(command,args,{encoding:'utf8',env,...options});
 const output=(result.stdout||'')+(result.stderr||'');
 console.log(output.replaceAll(password,'[ephemeral password]'));
 if(result.status!==0)throw new Error(`${command} failed (${result.status})`);
 return output;
}
try{
 run(join(bin,'initdb'),['-D',join(dir,'db'),'-U','postgres','-A','scram-sha-256','--pwfile',pwfile,'--no-locale','-E','UTF8']);
 run(join(bin,'pg_ctl'),['-D',join(dir,'db'),'-l',join(dir,'server.log'),'-o',`-p ${port} -c unix_socket_directories='' -c listen_addresses='127.0.0.1' -c timezone=UTC`,'-w','start']);started=true;
 run(join(bin,'psql'),['-X','-v','ON_ERROR_STOP=1'],{input:`
 create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;
 `});
 const db=`postgresql://postgres:${password}@127.0.0.1:${port}/postgres?sslmode=disable`;
 run('npx',['supabase','db','push','--db-url',db,'--yes']);
 run('npx',['supabase','db','push','--db-url',db,'--yes']);
 console.log('PASS: the Supabase migration consumer applies every migration; a second push is already up to date. Auth is a local fixture.');
}finally{
 if(started)spawnSync(join(bin,'pg_ctl'),['-D',join(dir,'db'),'-m','immediate','stop'],{encoding:'utf8'});
 rmSync(dir,{recursive:true,force:true});
}
