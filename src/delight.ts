import type {AccountState,Prediction,StyleName} from './types';

// Golden forecasts: 1 in N readings. Cosmetic; never more likely to come true.
export const goldenOdds=(plus:boolean)=>plus?10:50;
// Drawn once by the forecast server from its own plan; the saved result is never redrawn on a device.
export function assignEdition<T extends Prediction>(prediction:T,plus:boolean):T {
 const prefix=prediction.id.replaceAll('-','').slice(0,8);
 const golden=/^[0-9a-f]{8}$/i.test(prefix)&&parseInt(prefix,16)%goldenOdds(plus)===0;
 return {...prediction,golden};
}
// Ball and card styles. Ids are stored per user on the server; names are placeholders until the designed styles land.
export const styleCatalog:Record<StyleName,{name:string;plus:boolean}>={classic:{name:'Classic',plus:false},gold:{name:'Gold',plus:true},obsidian:{name:'Obsidian',plus:true}};
export const isStyle=(value:unknown):value is StyleName=>typeof value==='string'&&Object.hasOwn(styleCatalog,value);
export function selectedStyle(state:Pick<AccountState,'plus'|'ballStyle'|'cardStyle'>,kind:'ball'|'card'):StyleName {
 return state.plus?(state[kind==='ball'?'ballStyle':'cardStyle']||'classic'):'classic';
}
export const skinColors={classic:{fill:'transparent',rim:'transparent'},gold:{fill:'#E0A45855',rim:'#E0A458'},obsidian:{fill:'#05060B99',rim:'#8F91A3'}};
