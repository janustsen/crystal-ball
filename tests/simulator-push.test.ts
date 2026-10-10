import test from 'node:test';
import assert from 'node:assert/strict';
import {apnsPayload,pushMessage} from '../server/social-push';
test('a queued push becomes the APNs payload expo-notifications routes, with no private text',()=>{
 const sky=apnsPayload(pushMessage({id:'1',token:'ExpoPushToken[x]',kind:'sky',circle_id:null}));
 assert.deepEqual(sky,{aps:{alert:{title:'Crystal Ball',body:'The Sky is open.'},sound:'default'},body:{social:true,sky:true}});
 const seal=apnsPayload(pushMessage({id:'2',token:'ExpoPushToken[x]',kind:'seal',circle_id:'c1'}));
 assert.deepEqual(seal.body,{social:true,circle:'c1'});assert.equal(seal.aps.alert.body,'Someone sealed a forecast for you.');
});
