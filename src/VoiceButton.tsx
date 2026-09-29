import {Pressable} from 'react-native';
import {ExpoSpeechRecognitionModule,useSpeechRecognitionEvent} from 'expo-speech-recognition';
import {useState} from 'react';
import {Txt,styles} from './ui';
export function VoiceButton({onText,onNotice}:{onText:(text:string)=>void;onNotice:(text:string)=>void}){
 const [active,setActive]=useState(false);
 useSpeechRecognitionEvent('result',event=>{const text=event.results[0]?.transcript;if(text)onText(text)});
 useSpeechRecognitionEvent('end',()=>setActive(false));
 useSpeechRecognitionEvent('error',()=>{setActive(false);onNotice('Voice is unavailable. You can type your question instead.')});
 return <Pressable accessibilityRole="button" accessibilityLabel="Hold to speak" onPressIn={async()=>{try{const p=await ExpoSpeechRecognitionModule.requestPermissionsAsync();if(!p.granted){onNotice('Microphone permission is off. Type your question instead.');return;}setActive(true);ExpoSpeechRecognitionModule.start({lang:'en-US',interimResults:true,continuous:false});}catch{onNotice('Voice needs a native development build. Type your question instead.')}}} onPressOut={()=>{ExpoSpeechRecognitionModule.stop();setActive(false)}} style={[styles.action,styles.quiet]}><Txt style={{textAlign:'center'}}>{active?'Listening… release to finish':'Hold to speak'}</Txt></Pressable>;
}
