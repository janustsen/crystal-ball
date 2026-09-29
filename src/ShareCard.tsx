import {useEffect,useRef,useState} from 'react';
import {View,Platform,Image as PreviewImage} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {captureRef} from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {File,Paths} from 'expo-file-system';
import {Txt,Orb,Action,colors,styles} from './ui';
import {orbArtwork} from './orbArtwork';
import type {Prediction} from './types';
export function ShareCard({prediction,onClose,onNotice}:{prediction:Prediction;onClose:()=>void;onNotice:(message:string)=>void}){
 const ref=useRef<View>(null),[preview,setPreview]=useState<string>(),setNotice=onNotice;
 useEffect(()=>{if(Platform.OS==='web')void stillImage().then(setPreview).catch(()=>setNotice('Preview could not load. Please reopen this card.'))},[prediction.id]);
 async function stillImage():Promise<string>{
  if(Platform.OS!=='web'){const uri=await captureRef(ref,{format:'png',quality:1,width:1080,height:1920});return 'data:image/png;base64,'+await new File(uri).base64();}
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d');if(!ctx)throw new Error();
  const gradient=ctx.createLinearGradient(0,0,0,1920);gradient.addColorStop(0,colors.ink);gradient.addColorStop(.5,colors.violet);gradient.addColorStop(1,colors.ink);ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1920);
  for(let i=0;i<48;i++){ctx.globalAlpha=.18+(i%3)*.12;ctx.fillStyle=i%4===0?colors.gold:colors.ivory;ctx.beginPath();ctx.arc((i*193+71)%1080,(i*337+93)%1920,i%5===0?2.3:1.2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  const stars=[[150,1670],[350,1570],[590,1710],[810,1550],[970,1640]];ctx.strokeStyle=colors.lavender;ctx.globalAlpha=.3;ctx.lineWidth=1.5;ctx.beginPath();stars.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.fillStyle=colors.gold;for(const [x,y] of stars){ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  const orb=new Image();orb.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(orbArtwork.replace('</svg>','<circle cx="150" cy="142" r="108" stroke="#F5C76B" stroke-width="1.5" fill="none"/><path d="M105 153 L130 117 L161 143 L192 104 L208 152" fill="none" stroke="#F5C76B" stroke-width="1"/><g fill="#F5C76B"><circle cx="105" cy="153" r="2"/><circle cx="130" cy="117" r="2"/><circle cx="161" cy="143" r="2"/><circle cx="192" cy="104" r="2"/><circle cx="208" cy="152" r="2"/></g></svg>'));await orb.decode();ctx.drawImage(orb,250,410,580,580);
  ctx.textAlign='center';ctx.fillStyle=colors.ivory;ctx.font='82px CormorantGaramond_500Medium, Georgia';
  const headline=prediction.headline.replace(/(\d+)\s+(months?|years?|weeks?|days?)/gi,'$1\u00a0$2');
  const wrap=(text:string)=>{const lines:string[]=[];let line='';for(const word of text.split(' ')){if(ctx.measureText((line+' '+word).trim()).width<=820){line=(line+' '+word).trim();continue;}if(line){lines.push(line);line='';}for(const letter of word){if(ctx.measureText(line+letter).width>820){lines.push(line);line='';}line+=letter;}}if(line)lines.push(line);return lines;};
  let font=82,lines=wrap(headline);while(lines.length>3&&font>36){font-=2;ctx.font=`${font}px CormorantGaramond_500Medium, Georgia`;lines=wrap(headline);}
  let y=1080;for(const line of lines){ctx.fillText(line,540,y);y+=font*1.25;}y-=font*1.25;
  ctx.font='54px DMSans_400Regular, sans-serif';ctx.fillStyle=colors.gold;const labelY=Math.min(y+100,1370);ctx.fillText('Speculative forecast',540,labelY);ctx.fillText('Not a guarantee',540,labelY+72);ctx.font='64px CormorantGaramond_500Medium, Georgia';ctx.drawImage(orb,338,295,72,72);ctx.fillText('Crystal Ball',580,350);
  ctx.font='44px DMSans_400Regular, sans-serif';ctx.fillStyle=colors.muted;ctx.fillText(new Date(prediction.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}),540,405);
  return canvas.toDataURL('image/png');
 }
 async function animated(){setNotice('Making your four-second story…');try{
  const image=await stillImage();const response=await fetch(`${process.env.EXPO_PUBLIC_ENGINE_URL||'http://127.0.0.1:8787'}/share`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:AbortSignal.timeout(60000)});if(!response.ok)throw new Error();const data=await response.arrayBuffer();
  if(Platform.OS==='web'){const url=URL.createObjectURL(new Blob([data],{type:'video/mp4'}));const a=document.createElement('a');a.href=url;a.download='crystal-ball-story.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}else{const file=new File(Paths.cache,'crystal-ball-story.mp4');file.write(new Uint8Array(data));await Sharing.shareAsync(file.uri,{mimeType:'video/mp4'})}
  setNotice('Your animated story is ready. Private answers are excluded.');
 }catch{setNotice('Animation could not be exported. Try again, or export the still card.')}}
 async function share(){try{const image=await stillImage();if(Platform.OS==='web'){const a=document.createElement('a');a.download='crystal-ball-prediction.png';a.href=image;a.click();setNotice('1080 × 1920 card downloaded. Private answers are excluded.')}else{const file=new File(Paths.cache,'crystal-ball-card.png');file.write(image.split(',')[1],{encoding:'base64'});await Sharing.shareAsync(file.uri,{mimeType:'image/png'})}}catch{setNotice('The card could not be exported. Please try again.')}}
 return <><Txt display style={styles.title}>Send a little wonder.</Txt><Txt style={styles.muted}>Only your prediction goes on the card. Your answers stay private.</Txt><View ref={ref} collapsable={false} style={{marginTop:20,width:Platform.OS==='web'?'66%':'100%',alignSelf:'center',aspectRatio:9/16,borderRadius:16,overflow:'hidden'}}>{Platform.OS==='web'&&preview?<PreviewImage accessibilityLabel="Your exported prediction card" source={{uri:preview}} style={{width:'100%',height:'100%'}}/>:<LinearGradient colors={[colors.ink,colors.violet,colors.ink]} style={{flex:1,alignItems:'center',justifyContent:'center',padding:24}}><Txt style={{color:colors.gold,marginBottom:8}}>Crystal Ball</Txt><Txt style={[styles.caption,{marginBottom:8}]}>{new Date(prediction.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</Txt><Orb size={180} reduce/><Txt display style={{fontSize:28,lineHeight:32,textAlign:'center'}}>{prediction.headline}</Txt><Txt style={[styles.caption,{textAlign:'center',marginTop:24,color:colors.gold}]}>Speculative forecast · not a guarantee</Txt></LinearGradient>}</View><Action label="Export animated story" onPress={animated}/><Action label="Export story card" quiet onPress={share}/><Action label="Back to prediction" quiet onPress={onClose}/></>;
}
