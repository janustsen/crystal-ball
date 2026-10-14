import test from 'node:test';
import assert from 'node:assert/strict';
import {sealedLink,webAddress,webLink} from '../src/social-links';

test('sealed links use HTTPS on native and web and round-trip their token',()=>{
 const token='a token & another?';
 const url=new URL(sealedLink(token,'https://crystal.example/ignored?old=value',false));
 assert.equal(url.origin,'https://crystal.example');
 assert.equal(url.pathname,'/');
 assert.deepEqual([...url.searchParams],[['seal',token]]);
 for(const origin of ['http://crystal.example','crystalball://','javascript:alert(1)','https://user:secret@crystal.example'])assert.throws(()=>sealedLink(token,origin,false));
 assert.throws(()=>sealedLink(token,'',false),/Configure/);
});

test('the web app defaults to its own origin; native needs a configured one',t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'location');
 Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'http://localhost:8095'}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'location',previous);else Reflect.deleteProperty(globalThis,'location');});
 assert.equal(sealedLink('receipt','',true),'http://localhost:8095/?seal=receipt');
 assert.equal(sealedLink('receipt','http://localhost:8096',true),'http://localhost:8096/?seal=receipt');
 assert.equal(sealedLink('receipt','',false),'http://localhost:8095/?seal=receipt');
 assert.throws(()=>sealedLink('receipt','http://localhost:8096',false),/HTTPS/);
});

test('invite and friend links open the same web origin, and cards print its address',()=>{
 assert.equal(webLink({circle:'invite'},'https://crystal.example',false),'https://crystal.example/?circle=invite');
 assert.deepEqual([...new URL(webLink({friend:'1',question:'Will I?'},'https://crystal.example',false)).searchParams],[['friend','1'],['question','Will I?']]);
 assert.equal(webAddress('https://crystal.example/ignored',false),'crystal.example');
 assert.equal(webAddress('',false),'');
 assert.equal(webAddress('crystalball://',false),'');
});
