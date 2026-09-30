import type {AccountState, Facts, Prediction} from './types';
export type Backup = Pick<AccountState, 'facts' | 'history'>;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');
export const validFacts = (v: unknown): v is Facts => object(v) && Object.values(v).every(x => typeof x === 'string');
export function validPrediction(v: unknown): v is Prediction {
 return object(v) && ['id','question','headline','createdAt','label','why'].every(k => typeof v[k] === 'string') &&
  typeof v.id === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(v.id) && Number.isFinite(Date.parse(String(v.createdAt))) &&
  validFacts(v.facts) && typeof v.friend === 'boolean' && strings(v.assumptions) && Array.isArray(v.sources) &&
  v.sources.every(s => object(s) && ['title','url','date','publisher'].every(k => typeof s[k] === 'string')) &&
  (v.outcome === undefined || ['yes','no','pending'].includes(String(v.outcome)));
}
export function mergeBackup(local: AccountState, remote: Backup): AccountState {
 // Existing-device edits win; credits and preferences never come from a backup.
 const history = [...new Map([...remote.history,...local.history].map(p => [p.id,p])).values()]
  .sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt));
 return {...local,facts:{...remote.facts,...local.facts},history};
}
