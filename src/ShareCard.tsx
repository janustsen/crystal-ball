import {drawStoryHeadlines} from './story-layout';
import {useEffect,useRef,useState} from 'react';
import {View,Platform,Pressable,Image as PreviewImage} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {captureRef} from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {File,Paths} from 'expo-file-system';
import {Txt,Orb,Action,colors,fonts,styles} from './ui';
import {Asset} from 'expo-asset';
import {suggestedCheckIn} from './retention';
import type {StoryCard} from './story-card';
import {friendLink,reminder} from './native';
import {selectedStyle,skinColors} from './delight';
import {useStore} from './store';
import type {Prediction} from './types';
const copy={
 forecast:{title:'Share this glimpse',note:'Only the forecast, its check-in date and speculative label are shared. Review the headline before sharing; it may contain details you supplied. Never your question, answers or reasoning.',back:'Back to forecast'},
 receipt:{title:'Share your receipt',note:'Only the headline, its category and your check-in dates are shared. Never your question, answers or reasoning.',back:'Back to forecast'},
 'golden-set':{title:'Share your golden set',note:'Only your golden headlines and how many you hold are shared. Never your questions, answers or reasoning.',back:'Back to History'},
};
// Draws a StoryCard on the current look. Forecast cards also get the recording, link and reminder options.
export function ShareCard({card,prediction,onClose,onNotice,onRecord}:{card:StoryCard;prediction?:Prediction;onClose:()=>void;onNotice:(message:string)=>void;onRecord?:()=>void}){
 const {state}=useStore(),golden=card.golden,cardStyle=selectedStyle(state,'card'),ballStyle=selectedStyle(state,'ball');
 const cardCenter=golden||cardStyle==='gold'?'#684519':cardStyle==='obsidian'?'#12131C':colors.violet;
 const ref=useRef<View>(null),[preview,setPreview]=useState<string>(),[fullStory,setFullStory]=useState(false),[previewWidth,setPreviewWidth]=useState(212),setNotice=onNotice;
 useEffect(()=>{if(Platform.OS==='web')void stillImage().then(setPreview).catch(()=>setNotice('Preview could not load. Please reopen this card.'))},[JSON.stringify(card),cardStyle,ballStyle]);
 async function stillImage():Promise<string>{
  if(Platform.OS!=='web'){const uri=await captureRef(ref,{format:'png',quality:1,width:1080,height:1920});return 'data:image/png;base64,'+await new File(uri).base64();}
  // Keep export pixels on the CPU to avoid a synchronous GPU readback.
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error();
  const gradient=ctx.createLinearGradient(0,0,0,1920);gradient.addColorStop(0,colors.ink);gradient.addColorStop(.5,cardCenter);gradient.addColorStop(1,colors.ink);ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,1920);
  for(let i=0;i<48;i++){ctx.globalAlpha=.18+(i%3)*.12;ctx.fillStyle=i%4===0?colors.gold:colors.ivory;ctx.beginPath();ctx.arc((i*193+71)%1080,(i*337+93)%1920,i%5===0?2.3:1.2,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  const stars=[[150,1670],[350,1570],[590,1710],[810,1550],[970,1640]];ctx.strokeStyle=colors.lavender;ctx.globalAlpha=.3;ctx.lineWidth=1.5;ctx.beginPath();stars.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.fillStyle=colors.gold;for(const [x,y] of stars){ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  const orb=new Image();orb.src=Asset.fromModule(require('../assets/orb.png')).uri;await orb.decode();ctx.drawImage(orb,270,280,540,608);
  if(ballStyle!=='classic'){const skin=skinColors[ballStyle];ctx.fillStyle=skin.fill;ctx.strokeStyle=skin.rim;ctx.lineWidth=2;ctx.beginPath();ctx.arc(540,550,270,0,Math.PI*2);ctx.fill();ctx.stroke();}
  if(cardStyle!=='classic'&&!golden){ctx.strokeStyle=cardStyle==='gold'?colors.gold:'#8F91A3';ctx.lineWidth=3;ctx.strokeRect(64,64,952,1792);}
  if(golden){ctx.strokeStyle=colors.gold;ctx.lineWidth=8;ctx.strokeRect(48,48,984,1824);ctx.textAlign='center';ctx.font=`38px ${fonts.body}, sans-serif`;ctx.fillStyle=colors.gold;ctx.fillText('Golden edition · same uncertainty',540,1490);}
  ctx.textAlign='center';ctx.fillStyle=colors.ivory;
  const y=drawStoryHeadlines(ctx,card.headlines,fonts.display);
  ctx.fillStyle=colors.gold;const labelY=Math.min(y+100,1370);card.labels.forEach((label,i)=>{let size=42;do{ctx.font=`${size}px ${fonts.body}, sans-serif`;size-=2}while(ctx.measureText(label).width>900&&size>24);ctx.fillText(label,540,labelY+i*72)});ctx.font=`64px ${fonts.italic}, Georgia`;ctx.fillText('Crystal Ball',540,1590);
  ctx.font=`36px ${fonts.body}, sans-serif`;ctx.fillStyle=colors.muted;ctx.fillText(card.footer,540,1650);
  // Encode asynchronously so opening Share does not block the animation frame.
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
   if(!blob){reject(new Error('Could not encode story'));return;}
   const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  },'image/png'));
 }
 async function share(){try{const image=await stillImage();if(Platform.OS==='web'){const a=document.createElement('a');a.download=card.file;a.href=image;a.click();setNotice('1080 × 1920 card downloaded. Private answers are excluded.')}else{const file=new File(Paths.cache,card.file);file.write(image.split(',')[1],{encoding:'base64'});await Sharing.shareAsync(file.uri,{mimeType:'image/png'})}}catch{setNotice('The card could not be exported. Please try again.')}}
 const composition=<View ref={ref} collapsable={false} style={{width:Platform.OS==='web'?'100%':360,aspectRatio:9/16,borderRadius:8,overflow:'hidden',borderWidth:1,borderColor:'#614C34'}}>{Platform.OS==='web'&&preview?<PreviewImage accessibilityLabel="Your exported forecast card" source={{uri:preview}} style={{width:'100%',height:'100%'}}/>:<LinearGradient colors={[colors.ink,cardCenter,colors.ink]} style={{flex:1,alignItems:'center',justifyContent:'center',padding:24,borderWidth:cardStyle!=='classic'||golden?2:0,borderColor:golden||cardStyle==='gold'?colors.gold:'#8F91A3'}}><Orb size={180} reduce/>{golden?<Txt allowFontScaling={false} style={{color:colors.gold,textAlign:'center'}}>Golden edition · same uncertainty</Txt>:null}<Txt allowFontScaling={false} style={[styles.caption,{textAlign:'center',color:colors.gold,marginVertical:16}]}>{card.labels.join(' · ')}</Txt><View style={{width:'100%',flexShrink:1,minHeight:0}}>{card.headlines.map(headline=><Txt key={headline} display allowFontScaling={false} adjustsFontSizeToFit numberOfLines={5} style={{flexShrink:1,minHeight:0,fontSize:card.headlines.length>1?20:28,lineHeight:card.headlines.length>1?24:32,textAlign:'center',marginBottom:8}}>{headline}</Txt>)}</View><Txt display allowFontScaling={false} style={{fontFamily:fonts.italic,marginTop:24,fontSize:24}}>Crystal Ball</Txt><Txt allowFontScaling={false} style={styles.caption}>{card.footer}</Txt></LinearGradient>}</View>;
 const frame=<View onLayout={event=>setPreviewWidth(event.nativeEvent.layout.width)} style={{width:fullStory?'100%':'62%',alignSelf:'center',aspectRatio:9/16}}>{Platform.OS==='web'?composition:<View collapsable={false} style={{width:360,height:640,transformOrigin:'top left',transform:[{scale:previewWidth/360}]}}>{composition}</View>}</View>;
 if(fullStory)return <>{frame}<Action label="Export story card" onPress={share}/><Action label="Back to sharing" quiet onPress={()=>setFullStory(false)}/></>;
 const story={label:'Story image',detail:'9:16 still, 1080 × 1920',id:'export-story-card',run:share};
 return <><Txt display style={{fontSize:30,marginBottom:24}}>{copy[card.kind].title}</Txt>{prediction?<Txt style={styles.caption}>For video, review the headline, open Replay for recording, then use your device’s screen recorder. Frame the 9:16 card; Replay is free.</Txt>:null}<Pressable testID="preview-story-card" accessibilityRole="button" accessibilityLabel="Preview story card" onPress={()=>setFullStory(true)}>{frame}</Pressable><View style={{marginTop:24}}>{(prediction&&onRecord?[
  {label:'Replay for recording',detail:'Clean reveal · use your device’s screen recorder',id:'share-record-reveal',run:onRecord},
  story,
  {label:'Private friend link',detail:'Private to this friend reading.',id:'share-friend-link',run:async()=>{try{setNotice(`Friend link: ${await friendLink('What will my life look like next year?')}`)}catch{setNotice('Sharing was canceled. No link was sent.')}}},
  {label:'Remind me to check back',detail:'Yes, Not quite, or Not yet — tell your side.',id:'share-reminder',run:async()=>setNotice(await reminder(prediction.headline,prediction.id,suggestedCheckIn(prediction)))}
 ]:[story]).map(item=><Pressable key={item.id} testID={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={item.run} style={{paddingVertical:16,borderBottomWidth:1,borderColor:'#614C34'}}><Txt>{item.label} ↗</Txt><Txt style={styles.caption}>{item.detail}</Txt></Pressable>)}</View><Txt style={[styles.caption,{marginTop:24}]}>{copy[card.kind].note}</Txt><Action label={copy[card.kind].back} quiet onPress={onClose}/></>;
}
