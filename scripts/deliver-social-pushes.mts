import {deliverSocialPushes} from '../server/social-push.ts';
console.log(await deliverSocialPushes(key=>process.env[key]));
