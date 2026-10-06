import type {BallStyle,CardStyle} from './types.ts';
import {goldenOdds,isStyle} from './delight.ts';
// Store product ids must match App Store Connect and the RevenueCat offering; prices are the decided US list prices.
export const plans=[
 {kind:'weekly',product:'cb_plus_weekly',name:'Weekly',price:'$1.99',period:'week'},
 {kind:'monthly',product:'cb_plus_monthly',name:'Monthly',price:'$5.99',period:'month'},
 {kind:'annual',product:'cb_plus_yearly',name:'Yearly',price:'$39.99',period:'year'},
] as const;
export const packs=[
 {kind:'five',product:'cb_pack_5',readings:5,price:'$1.99'},
 {kind:'twenty',product:'cb_pack_20',readings:20,price:'$5.99'},
] as const;
export type PlanKind=typeof plans[number]['kind'];
export type PackKind=typeof packs[number]['kind'];
export const trialProduct='cb_plus_weekly',plusEntitlement='plus';
export const manageSubscriptionsUrl='https://apps.apple.com/account/subscriptions';
export const packReadings=(product:string)=>packs.find(p=>p.product===product)?.readings;
// Server-owned reading balance. The client only displays it.
// ballStyle/cardStyle are the user's saved choice; Classic renders whenever Plus is inactive.
export type Balance={owner:string;asOf:string;plus:boolean;plusUntil:string|null;packs:number;used:number;day:string;ballStyle?:BallStyle;cardStyle?:CardStyle};
export function validBalance(value:unknown):value is Balance{
 if(!value||typeof value!=='object')return false;
 const b=value as Record<string,unknown>;
 return typeof b.owner==='string'&&b.owner.length>0&&typeof b.asOf==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(b.asOf)&&Number.isFinite(Date.parse(b.asOf))&&typeof b.plus==='boolean'&&(b.plusUntil===null||typeof b.plusUntil==='string')&&Number.isInteger(b.packs)&&Number.isInteger(b.used)&&typeof b.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.day)&&(b.ballStyle===undefined||isStyle(b.ballStyle,'ball'))&&(b.cardStyle===undefined||isStyle(b.cardStyle,'card'));
}
// The server's 402 message; the app opens Plans when it sees it.
export const noReadings='No readings left today. Choose Plus or a reading pack to keep going.';
export const dailyReadings=(plus:boolean)=>plus?10:1;
export const readingsLeft=(b:Pick<Balance,'plus'|'packs'|'used'>)=>Math.max(0,dailyReadings(b.plus)-b.used)+b.packs;
// Paywall copy: everything Plus unlocks, in order.
export const plusUnlocks=[`${dailyReadings(true)} readings a day`,'The deeper Why: your answers, assumptions and news leads, with your Moon and rising','Monthly chart weather','A narrated Ball',`Golden forecasts 1 in ${goldenOdds(true)} instead of 1 in ${goldenOdds(false)}`,'The Inner Library, with ball and card styles','Unlimited sealed cards'];
