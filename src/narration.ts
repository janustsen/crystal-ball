import * as Speech from 'expo-speech';
// On-device text-to-speech only; nothing leaves the phone.
export const speak=(text:string)=>{Speech.stop();Speech.speak(text,{language:'en-US',rate:0.9,pitch:0.95})};
export const stopSpeaking=()=>{Speech.stop()};
