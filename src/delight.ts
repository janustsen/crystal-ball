import type {AccountState,Prediction,StyleOf} from './types';

// Golden forecasts: 1 in N readings. Cosmetic; never more likely to come true.
export const goldenOdds=(plus:boolean)=>plus?10:50;
// Drawn once by the forecast server from its own plan; the saved result is never redrawn on a device.
export function assignEdition<T extends Prediction>(prediction:T,plus:boolean):T {
 const prefix=prediction.id.replaceAll('-','').slice(0,8);
 const golden=/^[0-9a-f]{8}$/i.test(prefix)&&parseInt(prefix,16)%goldenOdds(plus)===0;
 return {...prediction,golden};
}
// Ball and card styles. Ids are stored per user on the server. The Plus ball styles are the local-AI renders in
// assets/styles (scripts/room-assets.mjs); the live glass ball takes its interior from them.
export const styleCatalog:{[K in keyof StyleOf]:Record<StyleOf[K],{name:string;plus:boolean}>}={
 ball:{classic:{name:'Classic',plus:false},smoke:{name:'Smoke',plus:true},aurora:{name:'Aurora',plus:true},obsidian:{name:'Obsidian',plus:true},gold:{name:'Gold-flecked',plus:true}},
 card:{classic:{name:'Classic',plus:false},gold:{name:'Gold',plus:true},obsidian:{name:'Obsidian',plus:true}},
};
export const isStyle=<K extends keyof StyleOf>(kind:K,value:unknown):value is StyleOf[K]=>typeof value==='string'&&Object.hasOwn(styleCatalog[kind],value);
export function selectedStyle<K extends keyof StyleOf>(state:Pick<AccountState,'plus'|'ballStyle'|'cardStyle'>,kind:K):StyleOf[K] {
 return (state.plus&&state[kind==='ball'?'ballStyle':'cardStyle']||'classic') as StyleOf[K];
}
// Plus narration: the headline is always spoken with its speculative label, never alone.
export function narration(state:Pick<AccountState,'plus'|'narrationMuted'>,prediction:Pick<Prediction,'headline'|'label'>):string|null {
 return state.plus&&!state.narrationMuted?`${prediction.headline} ${prediction.label.replaceAll(' · ',', ')}.`:null;
}
