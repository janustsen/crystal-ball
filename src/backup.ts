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

export function pendingBackupDeletion(state: AccountState): boolean {
 return (state.backupRevision ?? 0) > (state.backupAcknowledged ?? 0);
}
export function trackBackupDeletion(previous: AccountState, next: AccountState, forgetAll = false): AccountState {
 const retained = new Set(next.history.map(reading => reading.id));
 const facts = Object.keys(previous.facts).filter(key => !(key in next.facts));
 const history = previous.history.filter(reading => !retained.has(reading.id)).map(reading => reading.id);
 const revision = (previous.backupRevision ?? 0) + ((forgetAll || facts.length || history.length) && previous.backupOwner ? 1 : 0);
 const deletions = {facts:{...previous.backupDeletions?.facts},history:{...previous.backupDeletions?.history},all:previous.backupDeletions?.all};
 if(previous.backupOwner){
  for(const key of facts)deletions.facts[key]=revision;
  for(const id of history)deletions.history[id]=revision;
  if(forgetAll)deletions.all=revision;
 }
 for(const key of Object.keys(next.facts))delete deletions.facts[key];
 for(const id of retained)delete deletions.history[id];
 return {...next,backupOwner:previous.backupOwner,backupAcknowledged:previous.backupAcknowledged,
  backupRevision:revision,backupDeletions:deletions};
}

export type BackupReceipt = {owner: string; revision: number};
export function acknowledgeBackup(state: AccountState, receipt: BackupReceipt): AccountState {
 if(state.backupOwner && state.backupOwner !== receipt.owner)return state;
 const acknowledged = Math.max(state.backupAcknowledged ?? 0, receipt.revision);
 return state.backupOwner === receipt.owner && (state.backupAcknowledged ?? 0) === acknowledged ? state :
  {...state,backupOwner:receipt.owner,backupAcknowledged:acknowledged,backupDeletions:{
   facts:Object.fromEntries(Object.entries(state.backupDeletions?.facts??{}).filter(([,revision])=>revision>acknowledged)),
   history:Object.fromEntries(Object.entries(state.backupDeletions?.history??{}).filter(([,revision])=>revision>acknowledged)),
   all:(state.backupDeletions?.all??0)>acknowledged?state.backupDeletions?.all:undefined}};
}
export async function persistBackup(read:()=>AccountState, change:(fn:(state:AccountState)=>AccountState)=>void,
 save:(state:AccountState)=>Promise<void>, upload?: (state:AccountState)=>Promise<BackupReceipt|null>) {
 const snapshot=read();
 await save(snapshot);
 if(!upload)return;
 const receipt=await upload(snapshot);
 if(!receipt)return;
 change(state=>acknowledgeBackup(state,receipt));
 await save(read());
}
