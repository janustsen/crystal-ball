import {useEffect,useRef,useState} from 'react';
import {View,Platform,Pressable,Image as PreviewImage} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {captureRef} from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {File,Paths} from 'expo-file-system';
import {Txt,Orb,Action,colors,fonts,styles} from './ui';
import {Asset} from 'expo-asset';
import {suggestedCheckIn} from './retention';
import {friendLink,reminder} from './native';
import {selectedStyle,skinColors} from './delight';
import {useStore} from './store';
import type {Prediction} from './types';
export function ShareCard({prediction,onClose,onNotice,onRecord}:{prediction:Prediction;onClose:()=>void;onNotice:(message:string)=>void;onRecord:()=>void}){
 const {state}=useStore(),golden=prediction.golden,cardStyle=selectedStyle(state,'card'),ballStyle=selectedStyle(state,'ball');
 const cardCenter=golden||cardStyle==='gold'?'#684519':cardStyle==='obsidian'?'#12131C':colors.violet;
 const ref=useRef<View>(null),[preview,setPreview]=useState<string>(),[inspection,setInspection]=useState<'image'|'text'|null>(null),[previewWidth,setPreviewWidth]=useState(212),setNotice=onNotice;
 const fullStory=inspection!==null,returnControl=useRef('preview-story-card');
 const inspected=useRef(false);
 useEffect(()=>{
  if(!fullStory&&!inspected.current)return;
  inspected.current=true;
  if(Platform.OS==='web'){
   const target=document.querySelector<HTMLElement>(fullStory?'[data-testid="share-preview-heading"]':`[data-testid="${returnControl.current}"]`);
   if(fullStory)target?.setAttribute('tabindex','-1');
   target?.focus();if(fullStory)document.querySelector('[data-testid=screen-scroll]')?.scrollTo({top:0});
  }
 },[inspection]);
 const [more,setMore]=useState(false),[feedback,setFeedback]=useState(''),[exporting,setExporting]=useState(false),[exportFailed,setExportFailed]=useState(false),exportBusy=useRef(false);
 useEffect(()=>{if(Platform.OS==='web')void stillImage().then(setPreview).catch(()=>setNotice('Preview could not load. Please reopen this card.'))},[prediction.id,cardStyle,ballStyle]);
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
  ctx.textAlign='center';ctx.fillStyle=colors.ivory;ctx.font=`82px ${fonts.display}, Georgia`;
  const headline=prediction.headline.replace(/(\d+)\s+(months?|years?|weeks?|days?)/gi,'$1\u00a0$2');
  const wrap=(text:string)=>{const lines:string[]=[];let line='';for(const word of text.split(' ')){if(ctx.measureText((line+' '+word).trim()).width<=820){line=(line+' '+word).trim();continue;}if(line){lines.push(line);line='';}for(const letter of word){if(ctx.measureText(line+letter).width>820){lines.push(line);line='';}line+=letter;}}if(line)lines.push(line);return lines;};
  let font=82,lines=wrap(headline);while(lines.length>3&&font>36){font-=2;ctx.font=`${font}px ${fonts.display}, Georgia`;lines=wrap(headline);}
  let y=1080;for(const line of lines){ctx.fillText(line,540,y);y+=font*1.25;}y-=font*1.25;
  ctx.font=`56px ${fonts.body}, sans-serif`;ctx.fillStyle=colors.gold;const labelY=Math.min(y+100,1370);ctx.fillText('Speculative forecast',540,labelY);ctx.fillText('Not a guarantee',540,labelY+72);ctx.font=`64px ${fonts.italic}, Georgia`;ctx.fillText('Crystal Ball',540,1590);
  ctx.font=`44px ${fonts.body}, sans-serif`;ctx.fillStyle=colors.muted;ctx.fillText(`Check back ${suggestedCheckIn(prediction)}`,540,1650);
  // Encode asynchronously so opening Share does not block the animation frame.
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
   if(!blob){reject(new Error('Could not encode story'));return;}
   const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  },'image/png'));
 }
 async function share(){if(exportBusy.current)return;exportBusy.current=true;setExporting(true);setExportFailed(false);setFeedback('Preparing image…');try{const image=await stillImage();if(Platform.OS==='web'){const a=document.createElement('a');a.download='crystal-ball-forecast.png';a.href=image;a.click();setFeedback('Image download started. Private answers are excluded.')}else{const file=new File(Paths.cache,'crystal-ball-card.png');file.write(image.split(',')[1],{encoding:'base64'});await Sharing.shareAsync(file.uri,{mimeType:'image/png'});setFeedback('Share sheet closed. You can share again.')}}catch{setExportFailed(true);setFeedback('The card could not be exported. Please try again.')}finally{exportBusy.current=false;setExporting(false)}}
 const imageAction=<><Action testID="export-story-card" disabled={exporting} label={exportFailed?(Platform.OS==='web'?'Try download again':'Try sharing again'):Platform.OS==='web'?'Download image':'Share image'} onPress={share}/>{feedback?<Txt testID="share-export-status" accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:8,color:colors.gold}]}>{feedback}</Txt>:null}</>;
 const composition=<View ref={ref} collapsable={false} style={{width:Platform.OS==='web'?'100%':360,aspectRatio:9/16,borderRadius:8,overflow:'hidden',borderWidth:1,borderColor:'#614C34'}}>{Platform.OS==='web'&&preview?<PreviewImage accessibilityLabel={`Crystal Ball. ${prediction.headline} Speculative forecast. Not a guarantee.`} source={{uri:preview}} style={{width:'100%',height:'100%'}}/>:<LinearGradient colors={[colors.ink,cardCenter,colors.ink]} style={{flex:1,alignItems:'center',justifyContent:'center',padding:24,borderWidth:cardStyle!=='classic'||golden?2:0,borderColor:golden||cardStyle==='gold'?colors.gold:'#8F91A3'}}><Orb size={180} reduce/>{golden?<Txt style={{color:colors.gold,textAlign:'center'}}>Golden edition · same uncertainty</Txt>:null}<Txt allowFontScaling={false} style={[styles.caption,{fontSize:19,lineHeight:25,textAlign:'center',color:colors.gold,marginVertical:16}]}>Speculative forecast · not a guarantee</Txt><Txt display allowFontScaling={false} adjustsFontSizeToFit numberOfLines={5} style={{fontSize:28,lineHeight:32,textAlign:'center'}}>{prediction.headline}</Txt><Txt display allowFontScaling={false} style={{fontFamily:fonts.italic,marginTop:24,fontSize:24}}>Crystal Ball</Txt><Txt allowFontScaling={false} style={styles.caption}>Check back {suggestedCheckIn(prediction)}</Txt></LinearGradient>}</View>;
 const card=<View onLayout={event=>setPreviewWidth(event.nativeEvent.layout.width)} style={{width:fullStory?'100%':state.largeText?'48%':'60%',alignSelf:'center',aspectRatio:9/16}}>{Platform.OS==='web'?composition:<View collapsable={false} style={{width:360,height:640,transformOrigin:'top left',transform:[{scale:previewWidth/360}]}}>{composition}</View>}</View>;
 const imageText=<><Txt testID="share-image-text" style={{marginTop:8}}>{prediction.headline}</Txt><Txt style={[styles.caption,{marginTop:8,marginBottom:16}]}>Speculative forecast · not a guarantee</Txt>{golden?<Txt style={styles.caption}>Golden edition · same uncertainty</Txt>:null}<Txt style={[styles.caption,{marginBottom:16}]}>Crystal Ball · A glimpse, not a promise</Txt></>;
 if(fullStory)return <><Pressable testID="back-to-sharing" accessibilityRole="button" accessibilityLabel="Back to sharing" onPress={()=>setInspection(null)} style={{minHeight:48,justifyContent:'center',paddingVertical:8}}><Txt style={{color:colors.ice}}>‹ Back to sharing</Txt></Pressable><Txt testID="share-preview-heading" accessibilityRole="header" display style={{fontSize:28,lineHeight:34,marginBottom:16}}>{inspection==='text'?'Image text':'Your shared image'}</Txt>{inspection==='text'?<>{imageText}{imageAction}{card}</>:<>{card}<Txt style={[styles.caption,{marginTop:20}]}>Image text</Txt>{imageText}{imageAction}</>}</>;

 return <><Txt display style={{fontSize:30,lineHeight:36,marginBottom:24}}>Share this glimpse</Txt><Pressable testID="share-read-text" accessibilityRole="button" accessibilityLabel="Read image text" onPress={()=>{returnControl.current='share-read-text';setInspection('text')}} style={{minHeight:48,justifyContent:'center',marginBottom:8}}><Txt style={{color:colors.ice}}>Read image text ›</Txt></Pressable><Pressable testID="preview-story-card" accessibilityRole="button" accessibilityLabel="Enlarge shared image" onPress={()=>{returnControl.current='preview-story-card';setInspection('image')}}>{card}<Txt style={[styles.caption,{color:colors.gold,textAlign:'center',paddingVertical:16,minHeight:44}]}>Tap to enlarge ↗</Txt></Pressable>{imageAction}<Action testID="share-record-reveal" label="Replay for recording" quiet onPress={onRecord}/><Txt style={[styles.caption,{marginTop:16}]}>The forecast, check-in date and speculative label appear in your image. Review the headline before sharing; it may contain details you supplied. Your question, answers and reasoning stay private.</Txt><Pressable testID="share-more" accessibilityRole="button" aria-expanded={more} accessibilityState={{expanded:more}} onPress={()=>setMore(!more)} style={{minHeight:52,paddingVertical:16,marginTop:16,borderBottomWidth:1,borderColor:'#614C34'}}><Txt>{more?'Invite & remind −':'Invite & remind +'}</Txt></Pressable>{more?<View>{[
  {label:'Invite a friend',detail:'A fresh reading. None of your reading is included.',id:'share-friend-link',run:async()=>{try{setNotice(`Friend link: ${await friendLink('What will my life look like next year?')}`)}catch{setNotice('Sharing was canceled. No link was sent.')}}},
  {label:'Remind me to check back',detail:'Did it come true?',id:'share-reminder',run:async()=>setNotice(await reminder(prediction.headline,prediction.id,suggestedCheckIn(prediction)))}
 ].map(item=><View key={item.id}><Pressable testID={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={item.run} style={{minHeight:48,paddingVertical:16,borderBottomWidth:1,borderColor:'#614C34'}}><Txt>{item.label} ↗</Txt><Txt style={styles.caption}>{item.detail}</Txt></Pressable></View>)}</View>:null}<Action label="Back to forecast" quiet onPress={onClose}/></>;
}
