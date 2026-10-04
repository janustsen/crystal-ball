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
export type Balance={plus:boolean;plusUntil:string|null;packs:number;used:number;day:string};
export function validBalance(value:unknown):value is Balance{
 if(!value||typeof value!=='object')return false;
 const b=value as Record<string,unknown>;
 return typeof b.plus==='boolean'&&(b.plusUntil===null||typeof b.plusUntil==='string')&&Number.isInteger(b.packs)&&Number.isInteger(b.used)&&typeof b.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.day);
}
