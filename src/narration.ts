import * as Speech from 'expo-speech';
// Use platform speech synthesis; the app makes no narration service request.
export const speak=(text:string)=>{Speech.stop();Speech.speak(text,{language:'en-US',rate:0.9,pitch:0.95})};
export const stopSpeaking=()=>{Speech.stop()};
