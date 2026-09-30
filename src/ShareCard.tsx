import {useEffect,useRef,useState} from 'react';
import {View,Platform,Pressable,Image as PreviewImage} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {captureRef} from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {File,Paths} from 'expo-file-system';
import {Txt,Orb,Action,colors,fonts,styles} from './ui';
import {engineUrl} from './api';
import {Asset} from 'expo-asset';
import {friendLink,reminder} from './native';
import {isGolden} from './delight';
import type {Prediction} from './types';
export function ShareCard({prediction,onClose,onNotice}:{prediction:Prediction;onClose:()=>void;onNotice:(message:string)=>void}){
 const golden=isGolden(prediction.id);
 const ref=useRef<View>(null),[preview,setPreview]=useState<string>(),[fullStory,setFullStory]=useState(false),[previewWidth,setPreviewWidth]=useState(212),setNotice=onNotice;
 useEffect(()=>{if(Platform.OS==='web')void stillImage().then(setPreview).catch(()=>setNotice('Preview could not load. Please reopen this card.'))},[prediction.id]);
 async function stillImage():Promise<string>{
  if(Platform.OS!=='web'){const uri=await captureRef(ref,{format:'png',quality:1,width:1080,height:1920});return 'data:image/png;base64,'+await new File(uri).base64();}
  // Keep export pixels on the CPU to avoid a synchronous GPU readback.
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error();
  const gradient=ctx.createLinearGradient(0,0,0,1920);gradient.addColorStop(0,colors.ink);gradient.addColorStop(.5,golden?'#684519':colors.violet);gradient.addColorStop(1,colors.ink);ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1920);
  for(let i=0;i<48;i++){ctx.globalAlpha=.18+(i%3)*.12;ctx.fillStyle=i%4===0?colors.gold:colors.ivory;ctx.beginPath();ctx.arc((i*193+71)%1080,(i*337+93)%1920,i%5===0?2.3:1.2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  const stars=[[150,1670],[350,1570],[590,1710],[810,1550],[970,1640]];ctx.strokeStyle=colors.lavender;ctx.globalAlpha=.3;ctx.lineWidth=1.5;ctx.beginPath();stars.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.fillStyle=colors.gold;for(const [x,y] of stars){ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  const orb=new Image();orb.src=Asset.fromModule(require('../assets/orb.png')).uri;await orb.decode();ctx.drawImage(orb,270,280,540,608);
  if(golden){ctx.strokeStyle=colors.gold;ctx.lineWidth=8;ctx.strokeRect(48,48,984,1824);ctx.textAlign='center';ctx.font=`38px ${fonts.body}, sans-serif`;ctx.fillStyle=colors.gold;ctx.fillText('Golden edition · same uncertainty',540,1490);}
  ctx.textAlign='center';ctx.fillStyle=colors.ivory;ctx.font=`82px ${fonts.display}, Georgia`;
  const headline=prediction.headline.replace(/(\d+)\s+(months?|years?|weeks?|days?)/gi,'$1\u00a0$2');
  const wrap=(text:string)=>{const lines:string[]=[];let line='';for(const word of text.split(' ')){if(ctx.measureText((line+' '+word).trim()).width<=820){line=(line+' '+word).trim();continue;}if(line){lines.push(line);line='';}for(const letter of word){if(ctx.measureText(line+letter).width>820){lines.push(line);line='';}line+=letter;}}if(line)lines.push(line);return lines;};
  let font=82,lines=wrap(headline);while(lines.length>3&&font>36){font-=2;ctx.font=`${font}px ${fonts.display}, Georgia`;lines=wrap(headline);}
  let y=1080;for(const line of lines){ctx.fillText(line,540,y);y+=font*1.25;}y-=font*1.25;
  ctx.font=`42px ${fonts.body}, sans-serif`;ctx.fillStyle=colors.gold;const labelY=Math.min(y+100,1370);ctx.fillText('Speculative forecast',540,labelY);ctx.fillText('Not a guarantee',540,labelY+72);ctx.font=`64px ${fonts.italic}, Georgia`;ctx.fillText('Crystal Ball',540,1590);
  ctx.font=`36px ${fonts.body}, sans-serif`;ctx.fillStyle=colors.muted;ctx.fillText('A glimpse, not a promise',540,1650);
  // Encode asynchronously so opening Share does not block the animation frame.
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
   if(!blob){reject(new Error('Could not encode story'));return;}
   const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  },'image/png'));
 }
 async function animated(){setNotice('Making your four-second story…');try{
  const image=await stillImage();const response=await fetch(`${engineUrl}/share`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:AbortSignal.timeout(60000)});if(!response.ok)throw new Error();const data=await response.arrayBuffer();
  if(Platform.OS==='web'){const url=URL.createObjectURL(new Blob([data],{type:'video/mp4'}));const a=document.createElement('a');a.href=url;a.download='crystal-ball-story.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}else{const file=new File(Paths.cache,'crystal-ball-story.mp4');file.write(new Uint8Array(data));await Sharing.shareAsync(file.uri,{mimeType:'video/mp4'})}
  setNotice('Your animated story is ready. Private answers are excluded.');
 }catch{setNotice('Animation could not be exported. Try again, or export the still card.')}}
 async function share(){try{const image=await stillImage();if(Platform.OS==='web'){const a=document.createElement('a');a.download='crystal-ball-prediction.png';a.href=image;a.click();setNotice('1080 × 1920 card downloaded. Private answers are excluded.')}else{const file=new File(Paths.cache,'crystal-ball-card.png');file.write(image.split(',')[1],{encoding:'base64'});await Sharing.shareAsync(file.uri,{mimeType:'image/png'})}}catch{setNotice('The card could not be exported. Please try again.')}}
 const composition=<View ref={ref} collapsable={false} style={{width:Platform.OS==='web'?'100%':360,aspectRatio:9/16,borderRadius:8,overflow:'hidden',borderWidth:1,borderColor:'#614C34'}}>{Platform.OS==='web'&&preview?<PreviewImage accessibilityLabel="Your exported prediction card" source={{uri:preview}} style={{width:'100%',height:'100%'}}/>:<LinearGradient colors={[colors.ink,golden?'#684519':colors.violet,colors.ink]} style={{flex:1,alignItems:'center',justifyContent:'center',padding:24}}><Orb size={180} reduce/>{golden?<Txt style={{color:colors.gold,textAlign:'center'}}>Golden edition · same uncertainty</Txt>:null}<Txt allowFontScaling={false} style={[styles.caption,{textAlign:'center',color:colors.gold,marginVertical:16}]}>Speculative forecast · not a guarantee</Txt><Txt display allowFontScaling={false} adjustsFontSizeToFit numberOfLines={5} style={{fontSize:28,lineHeight:32,textAlign:'center'}}>{prediction.headline}</Txt><Txt display allowFontScaling={false} style={{fontFamily:fonts.italic,marginTop:24,fontSize:24}}>Crystal Ball</Txt></LinearGradient>}</View>;
 const card=<View onLayout={event=>setPreviewWidth(event.nativeEvent.layout.width)} style={{width:fullStory?'100%':'62%',alignSelf:'center',aspectRatio:9/16}}>{Platform.OS==='web'?composition:<View collapsable={false} style={{width:360,height:640,transformOrigin:'top left',transform:[{scale:previewWidth/360}]}}>{composition}</View>}</View>;
 if(fullStory)return <>{card}<Action label="Export story card" onPress={share}/><Action label="Back to sharing" quiet onPress={()=>setFullStory(false)}/></>;
 return <><Txt display style={{fontSize:30,marginBottom:24}}>Share this glimpse</Txt><Pressable testID="preview-story-card" accessibilityRole="button" accessibilityLabel="Preview story card" onPress={()=>setFullStory(true)}>{card}</Pressable><View style={{marginTop:24}}>{[
  {label:'Story image',detail:'9:16 still, 1080 × 1920',id:'export-story-card',run:share},
  {label:'Story video',detail:'4 seconds: the smoke clears, then the words',id:'export-animated-story',run:animated},
  {label:'Private friend link',detail:'Private to this friend reading.',id:'share-friend-link',run:async()=>{try{setNotice(`Friend link: ${await friendLink('What will my life look like next year?')}`)}catch{setNotice('Sharing was canceled. No link was sent.')}}},
  {label:'Remind me to check back',detail:'Did it come true?',id:'share-reminder',run:async()=>setNotice(await reminder(prediction.headline))}
 ].map(item=><Pressable key={item.id} testID={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={item.run} style={{paddingVertical:16,borderBottomWidth:1,borderColor:'#614C34'}}><Txt>{item.label} ↗</Txt><Txt style={styles.caption}>{item.detail}</Txt></Pressable>)}</View><Txt style={[styles.caption,{marginTop:24}]}>Only the prediction and its speculative label are shared. Never your question, answers or reasoning.</Txt><Action label="Back to prediction" quiet onPress={onClose}/></>;
}
