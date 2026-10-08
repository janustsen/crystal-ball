import {useEffect,useRef,useState} from 'react';
import {Pressable,View} from 'react-native';
import {Txt} from './ui';
import {SvgXml} from 'react-native-svg';
import {Surface} from './Surface';
const mic=(color:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></svg>`;
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
 return <Pressable accessibilityRole="button" accessibilityLabel={active?'Stop listening':'Start listening'} onPress={()=>active?ref.current?.stop():start()} style={{alignItems:'center',marginTop:14,minHeight:44}}><View style={{width:80,height:80,alignItems:'center',justifyContent:'center'}}><Surface kind="mic" state={active?'listening':undefined}/><View><SvgXml aria-hidden xml={mic(active?'#E3C78F':'#F4EBDD')} width={30} height={30}/></View></View><Txt style={{textAlign:'center',marginTop:6}}>{active?'Listening… tap to finish':'Start listening'}</Txt></Pressable>;
}
