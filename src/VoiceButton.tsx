import {Pressable,View} from 'react-native';
import {ExpoSpeechRecognitionModule,useSpeechRecognitionEvent} from 'expo-speech-recognition';
import {useEffect,useMemo,useState} from 'react';
import {Txt} from './ui';
import {voiceSession} from './integration-actions';
import {SvgXml} from 'react-native-svg';
import {Surface} from './Surface';
const mic=(color:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></svg>`;
export function VoiceButton({onText,onNotice,autoStart=false}:{onText:(text:string)=>void;onNotice:(text:string)=>void;autoStart?:boolean}){
 const [active,setActive]=useState(false);const voice=useMemo(()=>voiceSession({permission:async()=>(await ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted,start:()=>ExpoSpeechRecognitionModule.start({lang:'en-US',interimResults:true,continuous:false}),stop:()=>ExpoSpeechRecognitionModule.stop(),active:setActive,notice:onNotice}),[onNotice]);
 useEffect(()=>{if(autoStart)void voice.pressIn();return()=>{voice.pressOut()}},[voice]);
 useSpeechRecognitionEvent('result',event=>{const text=event.results[0]?.transcript;if(text)onText(text)});
 useSpeechRecognitionEvent('end',()=>setActive(false));
 useSpeechRecognitionEvent('error',()=>{setActive(false);onNotice('Voice is unavailable. You can type your question instead.')});
 return <Pressable accessibilityRole="button" accessibilityLabel={active?'Stop listening':'Start listening'} onPress={()=>active?voice.pressOut():void voice.pressIn()} style={{alignItems:'center',marginTop:14,minHeight:44}}><View style={{width:80,height:80,alignItems:'center',justifyContent:'center'}}><Surface kind="mic" state={active?'listening':undefined}/><View><SvgXml aria-hidden xml={mic(active?'#E3C78F':'#F4EBDD')} width={30} height={30}/></View></View><Txt style={{textAlign:'center',marginTop:6}}>{active?'Listening… tap to finish':'Start listening'}</Txt></Pressable>;
}
