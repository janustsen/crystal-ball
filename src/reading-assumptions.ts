import type {Prediction} from './types';

const legacyDisclaimers=new Set(['This is a speculative forecast, not a guarantee.','News headlines are context leads, not proof of a future result.']);
export function readingAssumptions(prediction:Prediction):string[]{
 const recorded=prediction.assumptions.filter(text=>!legacyDisclaimers.has(text));
 return recorded.length?recorded:(prediction.reasonSections||[]).filter(section=>section.title==='Scenario assumption').map(section=>section.body);
}
