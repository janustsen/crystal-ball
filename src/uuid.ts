import * as Crypto from 'expo-crypto';

// Plain-HTTP web origins (e.g. a LAN or tailnet preview) are not secure contexts, so crypto.randomUUID is
// missing there; crypto.getRandomValues is not secure-context gated, so build the RFC 4122 v4 UUID from it.
export function uuid(){
 try{return Crypto.randomUUID()}catch{}
 const bytes=Crypto.getRandomValues(new Uint8Array(16));
 bytes[6]=bytes[6]&0x0f|0x40;bytes[8]=bytes[8]&0x3f|0x80;
 const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
