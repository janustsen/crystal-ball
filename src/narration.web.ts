// The browser's own speech synthesis; silently absent where unsupported.
const synth=()=>typeof window!=='undefined'&&'speechSynthesis' in window?window.speechSynthesis:null;
export function speak(text:string){
 const voice=synth();if(!voice)return;
 voice.cancel();const line=new SpeechSynthesisUtterance(text);line.lang='en-US';line.rate=0.9;line.pitch=0.95;voice.speak(line);
}
export const stopSpeaking=()=>{synth()?.cancel()};
