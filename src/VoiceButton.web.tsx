import {useRef,useState} from 'react';
import {Pressable} from 'react-native';
import {Txt,styles} from './ui';
type Recognition={start:()=>void;stop:()=>void;lang:string;interimResults:boolean;onresult:((event:{results:{[key:number]:{[key:number]:{transcript:string}};length:number}})=>void)|null;onend:(()=>void)|null;onerror:(()=>void)|null};
export function VoiceButton({onText,onNotice}:{onText:(s:string)=>void;onNotice:(s:string)=>void}){
 const ref=useRef<Recognition|null>(null),[active,setActive]=useState(false);
 return <Pressable accessibilityRole="button" accessibilityLabel="Hold to speak" onPressIn={()=>{
 const browser=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};const Constructor=browser.SpeechRecognition||browser.webkitSpeechRecognition;
 if(!Constructor){onNotice('Speech recognition is unavailable in this browser. Type your question instead.');return;}
 const speech=new Constructor();ref.current=speech;speech.lang='en-US';speech.interimResults=true;speech.onresult=e=>onText(e.results[e.results.length-1][0].transcript);speech.onend=()=>setActive(false);speech.onerror=()=>{setActive(false);onNotice('Voice could not start. Check microphone permission or type instead.')};setActive(true);speech.start();
 }} onPressOut={()=>{ref.current?.stop();setActive(false)}} style={[styles.action,styles.quiet]}><Txt style={{textAlign:'center'}}>{active?'Listening… release to finish':'Hold to speak'}</Txt></Pressable>
}
