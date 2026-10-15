import {sunSign} from './profile.ts';
import type {Bond} from './types.ts';

// Each sign's image in a bond's name; a partner without a known sign draws one from their first name.
const images:Record<string,string>={aries:'Ember',taurus:'Orchard',gemini:'Kite',cancer:'Tide',leo:'Lantern',virgo:'Quill',libra:'Bell',scorpio:'Key',sagittarius:'Compass',capricorn:'Summit',aquarius:'Comet',pisces:'Harbor'};
const signs=Object.keys(images);
const hash=(text:string)=>{let h=2166136261;for(const c of text.normalize('NFKC').toLowerCase())h=Math.imul(h^c.codePointAt(0)!,16777619);return h>>>0};
// Fire, earth, air, water: the same element or a classic pairing (fire with air, earth with water) raises the harmony.
const harmony=(a?:string,b?:string)=>{if(!a||!b)return 0;const x=signs.indexOf(a)%4,y=signs.indexOf(b)%4;return x===y?8:Math.abs(x-y)===2?5:0};

export const bondQuestion=(name:string)=>`What lies ahead for me and ${name}?`;

// A bond's name and percentage are stable for the same two people, so asking again never reshuffles them. The percentage
// measures the shared bond for fun, never the other person's feelings; it stays kind (64 to 98).
export function bondOf(viewerBirthday:string|undefined,partnerName:string,partnerSign?:string):Bond {
 const mine=sunSign(viewerBirthday),theirs=partnerSign&&images[partnerSign]?partnerSign:undefined;
 const seed=hash(`${viewerBirthday??''}|${partnerName}`),own=mine??signs[seed%12],partner=theirs??signs[hash(partnerName)%12];
 const other=partner===own?signs[(signs.indexOf(partner)+1)%12]:partner;
 return {name:`The ${images[own]} and the ${images[other]}`,percent:Math.min(98,64+seed%27+harmony(mine,theirs))};
}
