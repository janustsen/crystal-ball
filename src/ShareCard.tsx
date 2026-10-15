import {drawStoryHeadlines} from './story-layout';
import {useEffect,useRef,useState} from 'react';
import {View,Platform,Pressable,Image as PreviewImage} from 'react-native';
import {captureRef} from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {File,Paths} from 'expo-file-system';
import {Txt,Orb,Action,colors,fonts,styles} from './ui';
import type {StoryCard} from './story-card';
import {friendLink} from './native';
import {selectedStyle} from './delight';
import {looks,loadLook,paintBackdrop,paintBall,paintLabel} from './RevealClip';
import {useStore} from './store';
import type {Prediction} from './types';
import {Surface} from './Surface';
import {SvgXml} from 'react-native-svg';
import {lightBall,type Light} from './three-lights';
const copy={
 forecast:{title:'Share this glimpse',note:'Only the headline and its check-in date are shared. Review the headline before sharing; it may contain details you supplied. Never your question, answers or reasoning.',back:'Back to forecast'},
 receipt:{title:'Share your receipt',note:'Only the headline, its category and your check-in dates are shared. Never your question, answers or reasoning.',back:'Back to forecast'},
 'golden-set':{title:'Share your golden set',note:'Only your golden headlines and how many you hold are shared. Never your questions, answers or reasoning.',back:'Back to History'},
 'three-lights':{title:'Share your three lights',note:'Only your Sun, Moon and rising signs and their lines are shared. Never your birthday, birth time or place.',back:'Back to You'},
 week:{title:'Share my week',note:'Only your label and this week’s counts are shared. Never your questions, headlines, answers or reasoning.',back:'Back to your week'},
 year:{title:'Share my year',note:'Only your label and this year’s counts are shared. Never your questions, headlines, answers or reasoning.',back:'Back to your year'},
};
async function svgImage(xml:string){const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);await image.decode();return image}
// The three balls in a row over the room light, then one label and one line per light on the glass card.
async function paintLights(ctx:CanvasRenderingContext2D,lights:Light[],title:string){
 paintLabel(ctx,title.toUpperCase(),200,colors.gold,32);
 const balls=await Promise.all(lights.map(light=>svgImage(lightBall(light.color))));
 balls.forEach((ball,i)=>ctx.drawImage(ball,210+i*330-165,395,330,330));
 lights.forEach((light,i)=>{const y=1000+i*180;paintLabel(ctx,`${light.name} · ${light.sign}`.toUpperCase(),y,`rgb(${light.color})`,30);
  for(let size=52;;size-=2){ctx.font=`${size}px ${fonts.display}, Georgia`;if(size<=34||ctx.measureText(light.line!).width<=860)break}
  ctx.fillStyle=colors.ivory;ctx.fillText(light.line!,540,y+66)});
}
// Draws a StoryCard on the current look. Forecast cards also get the recording, link and reminder options.
export function ShareCard({card,prediction,onClose,onNotice,onRecord,onRemind}:{card:StoryCard;prediction?:Prediction;onClose:()=>void;onNotice:(message:string,done?:boolean)=>void;onRecord?:()=>void;onRemind?:()=>void}){
 const {state}=useStore(),golden=card.golden,cardStyle=selectedStyle(state,'card'),ballStyle=selectedStyle(state,'ball');
 const look=looks[golden?'golden':cardStyle];
 const ref=useRef<View>(null),[preview,setPreview]=useState<string>(),[fullStory,setFullStory]=useState(false),[previewWidth,setPreviewWidth]=useState(212),setNotice=onNotice;
 useEffect(()=>{if(Platform.OS==='web')void stillImage().then(setPreview).catch(()=>setNotice('Preview could not load. Please reopen this card.'))},[JSON.stringify(card),cardStyle,ballStyle]);
 async function stillImage():Promise<string>{
  if(Platform.OS!=='web'){const uri=await captureRef(ref,{format:'png',quality:1,width:1080,height:1920});return 'data:image/png;base64,'+await new File(uri).base64();}
  // Keep export pixels on the CPU to avoid a synchronous GPU readback.
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error();
  const look=await loadLook(cardStyle,ballStyle,golden);ctx.textAlign='center';paintBackdrop(ctx,look);
  if(card.lights)await paintLights(ctx,card.lights,card.labels[0]);else{
  // A Bond card: two balls with their names below (paintLabel centres on 540, so each name is shifted under its ball) and the percentage between.
  if(card.pair){paintBall(ctx,look,1,270,.56);paintBall(ctx,look,1,810,.56);[['YOU',-270],[card.pair.name.toUpperCase(),270]].forEach(([name,dx])=>{ctx.save();ctx.translate(Number(dx),0);paintLabel(ctx,String(name),830,colors.label,30,320);ctx.restore()});
   ctx.font=`112px ${fonts.display}, Georgia`;ctx.fillStyle=colors.gold;ctx.fillText(`${card.pair.percent}%`,540,600);paintLabel(ctx,'COMPATIBLE',660,colors.gold,28,240)}else paintBall(ctx,look);
  if(golden)paintLabel(ctx,'Golden edition',1510,colors.gold,30);
  ctx.textAlign='center';ctx.fillStyle=colors.ivory;
  const y=drawStoryHeadlines(ctx,card.headlines,fonts.display);
  const labelY=Math.min(y+100,1380);card.labels.forEach((label,i)=>paintLabel(ctx,label,labelY+i*56,colors.gold,32,760));}ctx.font=`64px ${fonts.italic}, Georgia`;ctx.fillStyle=colors.ivory;ctx.fillText('Crystal Ball',540,1600);
  paintLabel(ctx,card.footer,1665,colors.label,28);
  // Encode asynchronously so opening Share does not block the animation frame.
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
   if(!blob){reject(new Error('Could not encode story'));return;}
   const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
  },'image/png'));
 }
 async function share(){try{const image=await stillImage();if(Platform.OS==='web'){const a=document.createElement('a');a.download=card.file;a.href=image;a.click();setNotice('1080 × 1920 card downloaded. Private answers are excluded.',true)}else{const file=new File(Paths.cache,card.file);file.write(image.split(',')[1],{encoding:'base64'});await Sharing.shareAsync(file.uri,{mimeType:'image/png'})}}catch{setNotice('The card could not be exported. Please try again.')}}
 const composition=<View ref={ref} collapsable={false} style={{width:Platform.OS==='web'?'100%':360,aspectRatio:9/16,overflow:'hidden'}}>{Platform.OS==='web'&&preview?<PreviewImage accessibilityLabel="Your exported forecast card" source={{uri:preview}} style={{width:'100%',height:'100%'}}/>:<View style={{flex:1,alignItems:'center',justifyContent:'center',padding:30,backgroundColor:look.ground}}><View pointerEvents="none" style={{position:'absolute',top:12,right:12,bottom:12,left:12,borderRadius:16,borderColor:look.line,borderWidth:look.width/3}}/>{card.lights?<><Txt allowFontScaling={false} style={[styles.label,{color:colors.gold}]}>{card.labels[0]}</Txt><View style={{flexDirection:'row',marginVertical:12}}>{card.lights.map(light=><SvgXml key={light.key} xml={lightBall(light.color)} width={100} height={100}/>)}</View>{card.lights.map(light=><View key={light.key} style={{width:'100%',alignItems:'center',marginTop:14}}><Txt allowFontScaling={false} style={[styles.label,{color:`rgb(${light.color})`}]}>{light.name} · {light.sign}</Txt><Txt display allowFontScaling={false} adjustsFontSizeToFit numberOfLines={1} style={{fontSize:18,lineHeight:24,textAlign:'center'}}>{light.line}</Txt></View>)}</>:<>{card.pair?<View style={{flexDirection:'row',alignItems:'center',gap:12}}><Orb size={104} reduce/><Txt display allowFontScaling={false} style={{fontSize:30,color:colors.gold}}>{card.pair.percent}%</Txt><Orb size={104} reduce/></View>:<Orb size={180} reduce/>}{golden?<Txt allowFontScaling={false} style={{color:colors.gold,textAlign:'center'}}>Golden edition</Txt>:null}{card.labels.length?<Txt allowFontScaling={false} style={[styles.caption,{textAlign:'center',color:colors.gold,marginVertical:16}]}>{card.labels.join(' · ')}</Txt>:null}<View style={{width:'100%',flexShrink:1,minHeight:0}}>{card.headlines.map(headline=><Txt key={headline} display allowFontScaling={false} adjustsFontSizeToFit numberOfLines={5} style={{flexShrink:1,minHeight:0,fontSize:card.headlines.length>1?20:28,lineHeight:card.headlines.length>1?24:32,textAlign:'center',marginBottom:8}}>{headline}</Txt>)}</View></>}<Txt display allowFontScaling={false} style={{fontFamily:fonts.italic,marginTop:24,fontSize:24}}>Crystal Ball</Txt><Txt allowFontScaling={false} style={styles.caption}>{card.footer}</Txt></View>}</View>;
 const frame=<View onLayout={event=>setPreviewWidth(event.nativeEvent.layout.width)} style={{width:fullStory?'100%':'62%',alignSelf:'center',aspectRatio:9/16}}>{Platform.OS==='web'?composition:<View collapsable={false} style={{width:360,height:640,transformOrigin:'top left',transform:[{scale:previewWidth/360}]}}>{composition}</View>}</View>;
 if(fullStory)return <>{frame}<Action label="Export story card" onPress={share}/><Action label="Back to sharing" quiet onPress={()=>setFullStory(false)}/></>;
 const story={label:'Story image',detail:'9:16 still, 1080 × 1920',id:'export-story-card',run:share};
 return <><Txt display style={{fontSize:30,marginBottom:24}}>{copy[card.kind].title}</Txt>{prediction?<Txt style={styles.caption}>For video, review the headline, open Replay for recording, then use your device’s screen recorder. Frame the 9:16 card; Replay is free.</Txt>:null}<Pressable testID="preview-story-card" accessibilityRole="button" accessibilityLabel="Preview story card" onPress={()=>setFullStory(true)}>{frame}</Pressable><View style={{marginTop:24,padding:16}}><Surface kind="card">{(prediction&&onRecord?[
  {label:'Replay for recording',detail:'Clean reveal · use your device’s screen recorder',id:'share-record-reveal',run:onRecord},
  story,
  {label:'Private friend link',detail:'Private to this friend reading.',id:'share-friend-link',run:async()=>{try{setNotice(`Friend link: ${await friendLink('What will my life look like next year?')}`)}catch{setNotice('Sharing was canceled. No link was sent.')}}},
  ...(onRemind?[{label:'Remind me to check back',detail:'Yes, Not quite, or Not yet — tell your side.',id:'share-reminder',run:onRemind}]:[])
 ]:[story]).map(item=><Pressable key={item.id} testID={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={item.run} style={{padding:16,marginTop:10}}><Surface kind="row"><Txt>{item.label} ↗</Txt><Txt style={[styles.caption,{color:colors.ivory}]}>{item.detail}</Txt></Surface></Pressable>)}</Surface></View><Txt style={[styles.caption,{marginTop:24}]}>{card.pair?'Only the headline, the bond’s name and percentage and its check-in date are shared. Never your reasoning.':copy[card.kind].note}</Txt><Action label={copy[card.kind].back} quiet onPress={onClose}/></>;
}
