import {generateKeyPairSync} from 'node:crypto';
const {privateKey}=generateKeyPairSync('ec',{namedCurve:'P-256'});
export const appleFixture={APNS_TEAM_ID:'fixture-team',APNS_BUNDLE_ID:'com.janustsen.crystalball',APNS_ENVIRONMENT:'sandbox',APNS_KEY_ID:'fixture-key',APNS_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'}).toString(),APPLE_TEAM_ID:'fixture-team',APPLE_CLIENT_ID:'com.janustsen.crystalball',APPLE_KEY_ID:'fixture-key',APPLE_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'}).toString()};
export const nativeToken='a'.repeat(64);
