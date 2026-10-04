import {checkInDate} from './retention';
export type NativePorts = {
 platform:string;
 notifications:{cancel:(readingId:string)=>Promise<void>;clear:()=>Promise<void>;permission:(request:boolean)=>Promise<boolean>;schedule:(title:string,body:string,seconds:number,readingId?:string,followUp?:boolean)=>Promise<void>};
 share:(message:string,url:string)=>Promise<unknown>;
 link:(question:string)=>string;
};
export function nativeActions(ports:NativePorts){
 const answered=new Set<string>();
 let generation=0,writes:Promise<void>=Promise.resolve();
 function serialize(operation:()=>Promise<void>){const work=writes.then(operation);writes=work.catch(()=>{});return work;}
 return {
 cancelCheckIn(readingId:string){answered.add(readingId);return ports.platform==='web'?Promise.resolve():serialize(()=>ports.notifications.cancel(readingId));},
 forgetCheckIns(){generation++;return ports.platform==='web'?Promise.resolve():serialize(()=>ports.notifications.clear());},
 async reminder(_headline:string,readingId?:string,on?:string,requestPermission=true){
  if(readingId&&answered.has(readingId))return 'Your check-in is saved. Return to History whenever you like.';
  const version=generation,date=on?checkInDate(on):null;
  if(on&&!date)return 'The Due date is unavailable. You can still check in from History.';
  if(date&&date.getTime()<=Date.now())return 'This forecast is ready for a Check-in. Open it from History.';
  const when=date?date.toLocaleDateString():'30 days';
  if(ports.platform==='web')return `Native reminder preview: check back ${when}. Local notifications need an iOS or Android build.`;
  try{if(!await ports.notifications.permission(requestPermission))return 'Notifications are off. You can still check back from History.';
   await serialize(async()=>{
    if(version!==generation||(readingId&&answered.has(readingId)))throw new Error('Reading forgotten or answered');
    const due=date||new Date(Date.now()+30*86400000),followUp=new Date(due);
    followUp.setDate(followUp.getDate()+3);
    if(readingId)await ports.notifications.cancel(readingId);
    await ports.notifications.schedule('Did it come true?','The ball has a question for you.',Math.max(1,Math.ceil((due.getTime()-Date.now())/1000)),readingId);
    await ports.notifications.schedule('One last check-in','Your forecast is waiting in History. Come back whenever you like.',Math.max(1,Math.ceil((followUp.getTime()-Date.now())/1000)),readingId,true);
   });
   return `Check-back reminder set for ${when}.`;
  }catch{return 'The reminder could not be scheduled. You can still check back from History.';}
 },
 async friendLink(question:string){const url=ports.link(question);await ports.share(`Ask the Crystal Ball for yourself: ${url}`,url);return url;},
};}
export async function purchaseOfferings(mode:'mock'|'sandbox',platform:string,key:string|undefined,sdk:{configure:(key:string)=>void;get:()=>Promise<unknown>}){
 if(mode==='mock')return {mode,offerings:null};if(platform!=='ios'||!key)throw new Error('RevenueCat sandbox requires the configured iOS development build.');sdk.configure(key);return {mode,offerings:await sdk.get()};
}
export function voiceSession(port:{permission:()=>Promise<boolean>;start:()=>void;stop:()=>void;active:(value:boolean)=>void;notice:(message:string)=>void}){
 let held=false,started=false;
 return {async pressIn(){held=true;try{if(!await port.permission()){port.notice('Microphone permission is off. Type your question instead.');return;}if(!held)return;port.start();started=true;port.active(true);}catch{port.notice('Voice is unavailable. Type your question instead.');}},pressOut(){held=false;if(started){try{port.stop()}catch{port.notice('Voice stopped. You can edit the transcript.')}started=false;}port.active(false);}};
}
