import test from 'node:test';
import assert from 'node:assert/strict';
import {sealedLink} from '../src/social-links';

test('sealed links use HTTPS on native and web and round-trip their token',()=>{
 const token='a token & another?';
 const url=new URL(sealedLink(token,'https://crystal.example/ignored?old=value',false));
 assert.equal(url.origin,'https://crystal.example');
 assert.equal(url.pathname,'/');
 assert.deepEqual([...url.searchParams],[['seal',token]]);
 for(const origin of ['http://crystal.example','crystalball://','javascript:alert(1)','https://user:secret@crystal.example'])assert.throws(()=>sealedLink(token,origin,false));
 assert.throws(()=>sealedLink(token,'',false),/Configure/);
});

test('development defaults to the current preview origin',t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'location');
 Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'http://localhost:8095'}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'location',previous);else Reflect.deleteProperty(globalThis,'location');});
 assert.equal(sealedLink('receipt','',true),'http://localhost:8095/?seal=receipt');
 assert.equal(sealedLink('receipt','http://localhost:8096',true),'http://localhost:8096/?seal=receipt');
 assert.throws(()=>sealedLink('receipt','',false),/Configure/);
});
