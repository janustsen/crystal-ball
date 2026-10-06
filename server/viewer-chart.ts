import {validBirthday,type BirthChart} from '../src/profile.ts';
import {sunSigns} from '../src/social-policy.ts';

export function viewerChart(birthday:unknown,raw:unknown):{birthday?:string;chart?:BirthChart}{
 if(birthday!==undefined&&(typeof birthday!=='string'||!validBirthday(birthday)))throw new Error('Please check your birthday.');
 const sign=(value:unknown):value is string=>sunSigns.some(s=>s===value);
 const chart=raw&&typeof raw==='object'&&'moonSign'in raw&&'risingSign'in raw&&sign(raw.moonSign)&&sign(raw.risingSign)&&birthday?{moonSign:raw.moonSign,risingSign:raw.risingSign}:undefined;
 if(raw!==undefined&&!chart)throw new Error('Please check your birth details in You.');
 return {birthday,chart};
}
