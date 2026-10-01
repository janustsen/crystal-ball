import type {AccountState,Prediction,StyleName} from './types';

// Freeze the plan-dependent result before saving; upgrades and reopened readings never reroll it.
export function assignEdition(prediction:Prediction,plus:boolean):Prediction {
 if(prediction.golden!==undefined)return prediction;
 const prefix=prediction.id.replaceAll('-','').slice(0,8);
 const golden=/^[0-9a-f]{8}$/i.test(prefix)&&parseInt(prefix,16)%(plus?10:50)===0;
 return {...prediction,golden};
}
export function selectedStyle(state:Pick<AccountState,'plus'|'ballStyle'|'cardStyle'>,kind:'ball'|'card'):StyleName {
 return state.plus?(state[kind==='ball'?'ballStyle':'cardStyle']||'classic'):'classic';
}
export const skinColors={classic:{fill:'transparent',rim:'transparent'},gold:{fill:'#E0A45855',rim:'#E0A458'},obsidian:{fill:'#05060B99',rim:'#8F91A3'}};
