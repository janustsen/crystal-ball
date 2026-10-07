import {useEffect,useRef,useState} from 'react';
import {Pressable} from 'react-native';
import {Txt,styles} from './ui';
import {Material} from './Material';
type Recognition={start:()=>void;stop:()=>void;lang:string;interimResults:boolean;onresult:((event:{results:{[key:number]:{[key:number]:{transcript:string}};length:number}})=>void)|null;onend:(()=>void)|null;onerror:(()=>void)|null};
export function VoiceButton({onText,onNotice,autoStart=false}:{onText:(s:string)=>void;onNotice:(s:string)=>void;autoStart?:boolean}){
 const ref=useRef<Recognition|null>(null),[active,setActive]=useState(false),callbacks=useRef({onText,onNotice});callbacks.current={onText,onNotice};
 function start(){
  const browser=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};const Constructor=browser.SpeechRecognition||browser.webkitSpeechRecognition;
  if(!window.isSecureContext||!Constructor){callbacks.current.onNotice('Voice is unavailable here. Type your question instead.');return}
  const speech=new Constructor();ref.current=speech;speech.lang='en-US';speech.interimResults=true;
  speech.onresult=e=>callbacks.current.onText(e.results[e.results.length-1][0].transcript);speech.onend=()=>setActive(false);speech.onerror=()=>{setActive(false);callbacks.current.onNotice('Voice could not start. Check microphone permission or type instead.')};
  try{speech.start();setActive(true)}catch{setActive(false);callbacks.current.onNotice('Voice could not start. Type your question instead.')}
 }
 useEffect(()=>{if(autoStart)start();return()=>{const speech=ref.current;if(speech){speech.onresult=null;speech.onend=null;speech.onerror=null;speech.stop()}}},[]);
 return <Pressable accessibilityRole="button" accessibilityLabel={active?'Stop listening':'Start listening'} onPress={()=>active?ref.current?.stop():start()} style={styles.action}><Material name="engraved-button"/><Txt style={{textAlign:'center'}}>{active?'Listening… tap to finish':'Start listening'}</Txt></Pressable>;
}
