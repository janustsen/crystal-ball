import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const code=ts.transpileModule(readFileSync(new URL('../src/uuid.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;

test('uuid falls back to getRandomValues when randomUUID is missing on an insecure web origin',()=>{
 // Mirrors expo-crypto's web build, which forwards to the page's crypto object; plain HTTP has no randomUUID.
 const insecure={getRandomValues:(bytes:any)=>crypto.getRandomValues(bytes)} as any;
 const expoCrypto={randomUUID:()=>insecure.randomUUID(),getRandomValues:(bytes:any)=>insecure.getRandomValues(bytes)};
 const module={exports:{} as any};
 runInNewContext(code,{module,exports:module.exports,require:(name:string)=>name==='expo-crypto'?expoCrypto:{}});
 const ids=Array.from({length:100},()=>module.exports.uuid());
 for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.equal(new Set(ids).size,ids.length);
});
