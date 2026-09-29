import {Pressable} from 'react-native';
import {ExpoSpeechRecognitionModule,useSpeechRecognitionEvent} from 'expo-speech-recognition';
import {useMemo,useState} from 'react';
import {Txt,styles} from './ui';
import {voiceSession} from './integration-actions';
export function VoiceButton({onText,onNotice}:{onText:(text:string)=>void;onNotice:(text:string)=>void}){
 const [active,setActive]=useState(false);const voice=useMemo(()=>voiceSession({permission:async()=>(await ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted,start:()=>ExpoSpeechRecognitionModule.start({lang:'en-US',interimResults:true,continuous:false}),stop:()=>ExpoSpeechRecognitionModule.stop(),active:setActive,notice:onNotice}),[onNotice]);
 useSpeechRecognitionEvent('result',event=>{const text=event.results[0]?.transcript;if(text)onText(text)});
 useSpeechRecognitionEvent('end',()=>setActive(false));
 useSpeechRecognitionEvent('error',()=>{setActive(false);onNotice('Voice is unavailable. You can type your question instead.')});
 return <Pressable accessibilityRole="button" accessibilityLabel="Hold to speak" onPressIn={voice.pressIn} onPressOut={voice.pressOut} style={[styles.action,styles.quiet]}><Txt style={{textAlign:'center'}}>{active?'Listening… release to finish':'Hold to speak'}</Txt></Pressable>;
}
