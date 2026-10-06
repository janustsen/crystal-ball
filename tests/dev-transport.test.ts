import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {functions} from '../scripts/social-dev-transport.mjs';

// A new RPC the engine calls must reach the verification adapter, or dev readings fail with a generic error.
test('dev transport allows every RPC the server calls',()=>{
 const migrations=readdirSync('supabase/migrations').map(file=>readFileSync(`supabase/migrations/${file}`,'utf8')).join('\n');
 const rpcs=new Set([...migrations.matchAll(/create (?:or replace )?function public\.(\w+)\(/g)].map(match=>match[1]));
 const server=readdirSync('server').filter(file=>file.endsWith('.ts')).map(file=>readFileSync(`server/${file}`,'utf8')).join('\n');
 const called=[...rpcs].filter(name=>new RegExp(`['\`](?:rpc/)?${name}['\`]`).test(server));
 assert.ok(called.includes('claim_web_reading')&&called.includes('finish_sky_push'));
 assert.deepEqual(called.filter(name=>!Object.hasOwn(functions,name)),[]);
});
