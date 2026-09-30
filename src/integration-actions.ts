import {checkInDate} from './retention';
export type NativePorts = {
 platform:string;
 notifications:{permission:()=>Promise<boolean>;schedule:(title:string,body:string,seconds:number,readingId?:string)=>Promise<void>};
 apple:{available:()=>Promise<boolean>;enabled:boolean;owner:()=>Promise<string|null>;signIn:()=>Promise<string|null>;link:(token:string)=>Promise<string|undefined>};
 share:(message:string,url:string)=>Promise<unknown>;
 link:(question:string)=>string;
};
export function nativeActions(ports:NativePorts){return {
 async reminder(headline:string,readingId?:string,on?:string){
  const date=on?checkInDate(on):null;
  if(on&&(!date||date.getTime()<=Date.now()))return 'Choose a future check-in date (YYYY-MM-DD).';
  const when=date?date.toLocaleDateString():'30 days';
  if(ports.platform==='web')return `Native reminder preview: check back ${when}. Local notifications need an iOS or Android build.`;
  try{if(!await ports.notifications.permission())return 'Notifications are off. You can still check back from History.';
   await ports.notifications.schedule('Did it come true?',headline,date?Math.ceil((date.getTime()-Date.now())/1000):30*86400,readingId);
   return `Check-back reminder set for ${when}.`;
  }catch{return 'The reminder could not be scheduled. You can still check back from History.';}
 },
 async saveWithApple(){if(ports.platform!=='ios'||!await ports.apple.available())return 'Sign in with Apple needs the configured iOS app. Your readings are saved on this device.';if(!ports.apple.enabled)return 'Apple account saving is not configured yet. Your readings remain on this device.';try{const owner=await ports.apple.owner(),token=await ports.apple.signIn();if(!token)return 'Apple did not return an identity token. Your local readings are safe.';if(await ports.apple.link(token)!==owner)throw new Error('Identity mismatch');return 'Saved with Apple. Your anonymous history stays with you.';}catch{return 'Apple saving was canceled or unavailable. Your local readings remain safe.';}},
 async friendLink(question:string){const url=ports.link(question);await ports.share(`Ask the Crystal Ball for yourself: ${url}`,url);return url;},
};}
export async function purchaseOfferings(mode:'mock'|'sandbox',platform:string,key:string|undefined,sdk:{configure:(key:string)=>void;get:()=>Promise<unknown>}){
 if(mode==='mock')return {mode,offerings:null};if(platform!=='ios'||!key)throw new Error('RevenueCat sandbox requires the configured iOS development build.');sdk.configure(key);return {mode,offerings:await sdk.get()};
}
export function voiceSession(port:{permission:()=>Promise<boolean>;start:()=>void;stop:()=>void;active:(value:boolean)=>void;notice:(message:string)=>void}){
 let held=false,started=false;
 return {async pressIn(){held=true;try{if(!await port.permission()){port.notice('Microphone permission is off. Type your question instead.');return;}if(!held)return;port.start();started=true;port.active(true);}catch{port.notice('Voice is unavailable. Type your question instead.');}},pressOut(){held=false;if(started){try{port.stop()}catch{port.notice('Voice stopped. You can edit the transcript.')}started=false;}port.active(false);}};
}
