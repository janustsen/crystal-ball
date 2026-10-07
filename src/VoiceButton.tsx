import {Pressable} from 'react-native';
import {ExpoSpeechRecognitionModule,useSpeechRecognitionEvent} from 'expo-speech-recognition';
import {useEffect,useMemo,useState} from 'react';
import {Txt,styles} from './ui';
import {voiceSession} from './integration-actions';
import {Material} from './Material';
export function VoiceButton({onText,onNotice,autoStart=false}:{onText:(text:string)=>void;onNotice:(text:string)=>void;autoStart?:boolean}){
 const [active,setActive]=useState(false);const voice=useMemo(()=>voiceSession({permission:async()=>(await ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted,start:()=>ExpoSpeechRecognitionModule.start({lang:'en-US',interimResults:true,continuous:false}),stop:()=>ExpoSpeechRecognitionModule.stop(),active:setActive,notice:onNotice}),[onNotice]);
 useEffect(()=>{if(autoStart)void voice.pressIn();return()=>{voice.pressOut()}},[voice]);
 useSpeechRecognitionEvent('result',event=>{const text=event.results[0]?.transcript;if(text)onText(text)});
 useSpeechRecognitionEvent('end',()=>setActive(false));
 useSpeechRecognitionEvent('error',()=>{setActive(false);onNotice('Voice is unavailable. You can type your question instead.')});
 return <Pressable accessibilityRole="button" accessibilityLabel={active?'Stop listening':'Start listening'} onPress={()=>active?voice.pressOut():void voice.pressIn()} style={styles.action}><Material name="oak-button"><Txt style={{textAlign:'center'}}>{active?'Listening… tap to finish':'Start listening'}</Txt></Material></Pressable>;
}
