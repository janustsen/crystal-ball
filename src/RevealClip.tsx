import {useState} from 'react';
import {Platform,View} from 'react-native';
import {Asset} from 'expo-asset';
import {Action,Txt,colors,fonts,styles,Toggle} from './ui';
import {suggestedCheckIn} from './retention';
import {selectedStyle} from './delight';
import {ballArt} from './roomAssets';
import {activityTheme,skyPrompts} from './social-policy';
import {useStore} from './store';
import type {Prediction,BallStyle,CardStyle} from './types';

type Look={cardStyle:CardStyle;ballStyle:BallStyle;golden:boolean;orb:HTMLImageElement;glass?:HTMLImageElement};
// Animation inputs (0-1) plus the clip-only lines. Defaults paint the still story card.
type Frame={orb?:number;text?:number;glow?:number;category?:string;question?:string;aiLabel?:boolean};

async function image(module:number){const image=new Image();image.src=Asset.fromModule(module).uri;await image.decode();return image}
export async function loadLook(cardStyle:CardStyle,ballStyle:BallStyle,golden=false):Promise<Look>{
 const [orb,glass]=await Promise.all([image(require('../assets/orb.png')),ballStyle==='classic'?undefined:image(ballArt[ballStyle].glass)]);
 return {cardStyle,ballStyle,golden,orb,glass};
}

// Card styles share the app's ground and glass card; each tints the ball's light and the card's outline.
export const looks:Record<CardStyle|'golden',{ground:string;light:string;line:string;width:number}>={
 classic:{ground:colors.ink,light:'232,170,90',line:'rgba(227,199,143,.22)',width:2},
 gold:{ground:colors.ink,light:'240,190,110',line:colors.gold,width:3},
 obsidian:{ground:'#0E0D11',light:'170,176,198',line:'rgba(176,180,198,.55)',width:3},
 golden:{ground:'#1A120B',light:'250,200,120',line:colors.gold,width:6},
};
const round=(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()};
// The ground, the ball's warm light and the glass card that holds the text (y 880 to 1720).
export function paintBackdrop(ctx:CanvasRenderingContext2D,{cardStyle,golden}:Pick<Look,'cardStyle'|'golden'>,glow=0){
 const look=looks[golden?'golden':cardStyle];
 ctx.globalAlpha=1;ctx.fillStyle=look.ground;ctx.fillRect(0,0,1080,1920);
 const light=ctx.createRadialGradient(540,560,40,540,560,620);light.addColorStop(0,`rgba(${look.light},${.26+.3*glow})`);light.addColorStop(1,`rgba(${look.light},0)`);ctx.fillStyle=light;ctx.fillRect(0,0,1080,1300);
 round(ctx,64,880,952,840,48);ctx.fillStyle='rgba(22,15,11,.62)';ctx.fill();ctx.strokeStyle=look.line;ctx.lineWidth=look.width;ctx.stroke();
}
// The ball: open scales and fades it in; a Bond card paints two smaller balls side by side (x, size).
export function paintBall(ctx:CanvasRenderingContext2D,{ballStyle,orb,glass}:Look,open=1,x=540,size=1){
 const scale=(.86+.14*open)*size,w=540*scale,h=608*scale,y=584-34*size;ctx.globalAlpha=open;ctx.drawImage(orb,x-w/2,584-h/2,w,h);
 if(ballStyle!=='classic'&&glass){ctx.save();ctx.beginPath();ctx.arc(x,y,270*scale,0,Math.PI*2);ctx.clip();ctx.drawImage(glass,x-270*scale,y-270*scale,540*scale,540*scale);ctx.restore();}
 ctx.globalAlpha=1;
}
// A label in the app's label style: Jost, letter-spaced, shrunk (spacing included) until it fits the card's text band.
export function paintLabel(ctx:CanvasRenderingContext2D,text:string,y:number,color:string=colors.label,size=34,maxWidth=860){
 const spaced=ctx as unknown as {letterSpacing:string};
 for(;;size-=2){ctx.font=`${size}px ${fonts.sansMedium}, sans-serif`;spaced.letterSpacing=`${Math.round(size*.14)}px`;if(size<=18||ctx.measureText(text).width<=maxWidth)break}
 ctx.fillStyle=color;ctx.fillText(text,540,y);spaced.letterSpacing='0px';
}

export function paintStory(ctx:CanvasRenderingContext2D,prediction:Prediction,look:Look,{orb:open=1,text=1,glow=0,category,question,aiLabel=false}:Frame={}){
 const golden=prediction.golden;
 ctx.textAlign='center';
 paintBackdrop(ctx,look,glow*.6);paintBall(ctx,look,open);
 if(aiLabel)paintLabel(ctx,'AI-generated · for entertainment',140,colors.muted,28);
 ctx.globalAlpha=text;
 if(golden)paintLabel(ctx,'Golden edition',1510,colors.gold,30);
 if(category)paintLabel(ctx,category.toUpperCase(),question?955:975,colors.gold);
 if(question){ctx.font=`38px ${fonts.italic}, Georgia`;ctx.fillStyle=colors.ivory;let line=`“${question}”`;while(ctx.measureText(line).width>900&&line.length>4)line=line.slice(0,-3)+'…”';ctx.fillText(line,540,1000);}
 ctx.fillStyle=colors.ivory;ctx.font=`82px ${fonts.display}, Georgia`;
 const headline=prediction.headline.replace(/(\d+)\s+(months?|years?|weeks?|days?)/gi,'$1 $2');
 const wrap=(text:string)=>{const lines:string[]=[];let line='';for(const word of text.split(' ')){if(ctx.measureText((line+' '+word).trim()).width<=820){line=(line+' '+word).trim();continue;}if(line){lines.push(line);line='';}for(const letter of word){if(ctx.measureText(line+letter).width>820){lines.push(line);line='';}line+=letter;}}if(line)lines.push(line);return lines;};
 let font=82,lines=wrap(headline);while(lines.length>3&&font>36){font-=2;ctx.font=`${font}px ${fonts.display}, Georgia`;lines=wrap(headline);}
 let y=1080;for(const line of lines){ctx.fillText(line,540,y);y+=font*1.25;}
 ctx.font=`64px ${fonts.italic}, Georgia`;ctx.fillStyle=colors.ivory;ctx.fillText('Crystal Ball',540,1600);
 paintLabel(ctx,`Check back ${suggestedCheckIn(prediction)}`,1665,colors.label,28);
 ctx.globalAlpha=1;
}

const ease=(t:number)=>{const x=Math.min(1,Math.max(0,t));return x*x*(3-2*x)};
// Timeline: the ball opens, the forecast card fades in and holds, then the end card.
function paintClip(ctx:CanvasRenderingContext2D,prediction:Prediction,look:Look,frame:Frame,ms:number){
 paintStory(ctx,prediction,look,{...frame,aiLabel:true,orb:ease(ms/1800),glow:Math.sin(Math.PI*Math.min(1,ms/2400))*.9,text:ease((ms-1600)/1000)});
 const end=ease((ms-6200)/600);
 if(end>0){
  ctx.globalAlpha=end;ctx.fillStyle=colors.ink;ctx.fillRect(0,0,1080,1920);ctx.drawImage(look.orb,360,520,360,405);
  ctx.textAlign='center';ctx.fillStyle=colors.ivory;ctx.font=`76px ${fonts.display}, Georgia`;ctx.fillText('search Crystal Ball',540,1120);
  ctx.fillStyle=colors.gold;ctx.font=`44px ${fonts.body}, sans-serif`;ctx.fillText('Ask the Ball your own question',540,1200);
  paintLabel(ctx,'AI-generated · for entertainment',140,colors.muted,28);
 }
 ctx.globalAlpha=.55;ctx.textAlign='right';ctx.fillStyle=colors.ivory;ctx.font=`30px ${fonts.italic}, Georgia`;ctx.fillText('Crystal Ball',990,1810);ctx.globalAlpha=1;ctx.textAlign='center';
}

// The app's own generated chime and hum (assets/audio); no licensed music.
async function soundtrack(audio:AudioContext){
 const destination=audio.createMediaStreamDestination();
 const [hum,chime]=await Promise.all([require('../assets/audio/hum.wav'),require('../assets/audio/chime.wav')].map(async module=>audio.decodeAudioData(await (await fetch(Asset.fromModule(module).uri)).arrayBuffer())));
 // Keep the hum audible through the capture tail; recordClip closes audio after the recorder stops.
 const play=(buffer:AudioBuffer,at:number,volume:number,loop=false)=>{const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;source.loop=loop;gain.gain.value=volume;source.connect(gain).connect(destination);source.start(audio.currentTime+at)};
 play(hum,0,.35,true);play(chime,1.6,.8);
 return destination.stream.getAudioTracks();
}

export async function recordClip(prediction:Prediction,look:Look,frame:Frame):Promise<globalThis.File>{
 const audio=new AudioContext(); // created inside the tap so the browser lets it play
 try{
  const type=['video/mp4;codecs=avc1,mp4a','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!type)throw new Error('unsupported');
  // Software backing avoids GPU readback stalls that truncate capture while the room animates.
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('unsupported');
  paintClip(ctx,prediction,look,frame,0);
  await audio.resume();
  const tracks=await soundtrack(audio),stream=canvas.captureStream(30);
  const video=stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  for(const track of tracks)stream.addTrack(track);
  const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:6_000_000}),chunks:Blob[]=[];
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
  const stopped=new Promise(resolve=>recorder.onstop=resolve);
  recorder.start(250);const start=performance.now();
  let endCardSince:number|undefined;
  // Display callbacks can pause. Capture on a timer and hold the fully painted end card
  // before stopping; stopping in the last paint's task can discard that frame.
  for(;;){
   const now=performance.now(),ms=now-start;paintClip(ctx,prediction,look,frame,ms);video.requestFrame?.();
   if(ms>=6800)endCardSince??=now;
   if(endCardSince!==undefined&&now-endCardSince>=1200)break;
   await new Promise(resolve=>setTimeout(resolve,1000/30));
  }
  recorder.requestData();await new Promise(resolve=>setTimeout(resolve,250));
  recorder.stop();await stopped;stream.getTracks().forEach(track=>track.stop());
  return new globalThis.File(chunks,`crystal-ball-reveal.${type.startsWith('video/mp4')?'mp4':'webm'}`,{type:type.split(';')[0]});
 }finally{void audio.close().catch(()=>{})}
}

// Web: MediaRecorder on a canvas. Native needs a view-to-video recorder module and a development build;
// until then native keeps Replay for recording with the device screen recorder (see SETUP.md).
export function RevealClip({prediction,onNotice}:{prediction:Prediction;onNotice:(message:string)=>void}){
 const {state}=useStore(),[question,setQuestion]=useState(false),[busy,setBusy]=useState(false);
 if(Platform.OS!=='web')return null;
 async function make(){
  setBusy(true);onNotice('');
  try{
   const look=await loadLook(selectedStyle(state,'card'),selectedStyle(state,'ball'),prediction.golden);
   await save(await recordClip(prediction,look,{category:skyPrompts[activityTheme(prediction.question)].label,question:question?prediction.question:undefined}));
  }catch(error){onNotice(error instanceof Error&&error.message==='unsupported'?'This browser cannot record video. Use Story image or Replay for recording instead.':'The clip could not be recorded. Please try again.')}
  finally{setBusy(false)}
 }
 async function save(clip:globalThis.File){
  const download=()=>{const url=URL.createObjectURL(clip),a=document.createElement('a');a.download=clip.name;a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);onNotice('1080 × 1920 reveal clip saved.')};
  if(navigator.canShare?.({files:[clip]}))await navigator.share({files:[clip]}).catch(error=>{if(error?.name!=='AbortError')download()});
  else download();
 }
 return <View style={{marginTop:12}}>
  <Action testID="make-reveal-clip" label={busy?'Recording the reveal…':'Make clip'} quiet disabled={busy} onPress={()=>void make()}/>
  <View style={[styles.row,{marginTop:8}]}><Txt style={styles.caption}>Show my question in the clip</Txt><Toggle testID="clip-question" accessibilityLabel="Show my question in the clip" value={question} disabled={busy} onValueChange={setQuestion}/></View>
 </View>;
}
