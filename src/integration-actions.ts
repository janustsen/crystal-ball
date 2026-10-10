export type NativePorts = {
 share:(message:string,url:string)=>Promise<unknown>;
 link:(question:string)=>string;
};
export function nativeActions(ports:NativePorts){
 return {
  async friendLink(question:string){const url=ports.link(question);await ports.share(`Ask the Crystal Ball for yourself: ${url}`,url);return url;},
 };
}
export async function purchaseOfferings(mode:'mock'|'store',platform:string,key:string|undefined,sdk:{configure:(key:string)=>void;get:()=>Promise<unknown>}){
 if(mode==='mock')return {mode,offerings:null};if(platform!=='ios'||!key)throw new Error('App Store purchases require the configured iOS build.');sdk.configure(key);return {mode,offerings:await sdk.get()};
}
export function voiceSession(port:{permission:()=>Promise<boolean>;start:()=>void;stop:()=>void;active:(value:boolean)=>void;notice:(message:string)=>void}){
 let held=false,started=false;
 return {async pressIn(){held=true;try{if(!await port.permission()){port.notice('Microphone permission is off. Type your question instead.');return;}if(!held)return;port.start();started=true;port.active(true);}catch{port.notice('Voice is unavailable. Type your question instead.');}},pressOut(){held=false;if(started){try{port.stop()}catch{port.notice('Voice stopped. You can edit the transcript.')}started=false;}port.active(false);}};
}
