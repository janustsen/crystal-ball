import {useRef,useState} from 'react';
import {View,Platform} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {captureRef} from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {File,Paths} from 'expo-file-system';
import {Txt,Orb,Action,colors,styles} from './ui';
import {orbArtwork} from './orbArtwork';
import type {Prediction} from './types';
export function ShareCard({prediction,onClose}:{prediction:Prediction;onClose:()=>void}){
 const ref=useRef<View>(null),[notice,setNotice]=useState('');
 async function animated(){setNotice('Making your four-second story…');try{const response=await fetch(`${process.env.EXPO_PUBLIC_ENGINE_URL||'http://127.0.0.1:8787'}/share`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({headline:prediction.headline})});if(!response.ok)throw new Error();const data=await response.arrayBuffer();if(Platform.OS==='web'){const url=URL.createObjectURL(new Blob([data],{type:'video/mp4'}));const a=document.createElement('a');a.href=url;a.download='crystal-ball-story.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}else{const file=new File(Paths.cache,'crystal-ball-story.mp4');file.write(new Uint8Array(data));await Sharing.shareAsync(file.uri,{mimeType:'video/mp4'})}setNotice('Your animated story is ready. Private answers are excluded.')}catch{setNotice('Animation could not be exported. Try again, or export the still card.')}}
 async function share(){try{
 if(Platform.OS==='web'){
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d');if(!ctx)throw new Error();
  const gradient=ctx.createLinearGradient(0,0,0,1920);gradient.addColorStop(0,colors.ink);gradient.addColorStop(.5,colors.violet);gradient.addColorStop(1,colors.ink);ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1920);
  const orb=new Image();orb.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(orbArtwork);await orb.decode();ctx.drawImage(orb,180,420,720,720);
  ctx.textAlign='center';ctx.fillStyle=colors.ivory;ctx.font='64px CormorantGaramond_500Medium, Georgia';
  const words=prediction.headline.split(' ');let line='',y=1040;for(const word of words){const next=`${line} ${word}`.trim();if(ctx.measureText(next).width>860){ctx.fillText(line,540,y);line=word;y+=80;}else line=next;}ctx.fillText(line,540,y);
  ctx.font='32px DMSans_400Regular, sans-serif';ctx.fillStyle=colors.muted;ctx.fillText('Speculative forecast · not a guarantee',540,1430);ctx.fillStyle=colors.gold;ctx.fillText('Crystal Ball',540,370);
  const a=document.createElement('a');a.download='crystal-ball-prediction.png';a.href=canvas.toDataURL('image/png');a.click();setNotice('1080 × 1920 card downloaded. Private answers are excluded.');
 }else{const uri=await captureRef(ref,{format:'png',quality:1,width:1080,height:1920});await Sharing.shareAsync(uri,{mimeType:'image/png'});}
 }catch{setNotice('The card could not be exported. Please try again.')}}
 return <><Txt display style={styles.title}>Send a little wonder.</Txt><Txt style={styles.muted}>Only your prediction goes on the card. Your answers stay private.</Txt><View ref={ref} collapsable={false} style={{marginTop:24,aspectRatio:9/16,borderRadius:24,overflow:'hidden'}}><LinearGradient colors={[colors.ink,colors.violet,colors.ink]} style={{flex:1,alignItems:'center',justifyContent:'center',padding:24}}><Txt style={{color:colors.gold,marginBottom:16}}>Crystal Ball</Txt><Orb size={180} reduce/><Txt display style={{fontSize:28,lineHeight:32,textAlign:'center'}}>{prediction.headline}</Txt><Txt style={[styles.caption,{textAlign:'center',marginTop:24}]}>Speculative forecast · not a guarantee</Txt></LinearGradient></View><Action label="Export animated story" onPress={animated}/><Action label="Export story card" quiet onPress={share}/><Action label="Back to prediction" quiet onPress={onClose}/>{notice?<Txt accessibilityLiveRegion="polite" style={styles.caption}>{notice}</Txt>:null}</>;
}
