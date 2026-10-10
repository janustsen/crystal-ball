// Encodes the approved room renders for the app and syncs the streamed clips to their host.
//   node scripts/room-assets.mjs build <v2 render dir> [plus dir]   bundled stills, flights + Home loop, ball track, the other
//                                                                    loops streamed in .local/room-assets, then the Plus art (see plus())
//   node scripts/room-assets.mjs sync <destination>      rsync the streamed clips (a local path such as public/room, or host:path)
import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

export const spots=['home','sky','ask','history','you'];
// Bump with the renders: the version is part of every streamed URL, so caches never mix two room builds.
export const roomVersion='v2';
const streamed='.local/room-assets',flights='assets/room/flights';
// ponytail: one CRF for every clip; tune per clip only if a spot shows banding.
const h264=['-c:v','libx264','-preset','slow','-crf','25','-pix_fmt','yuv420p','-profile:v','high','-movflags','+faststart','-an'];

const ffmpeg=(...args)=>execFileSync('ffmpeg',['-loglevel','error','-y',...args],{stdio:'inherit'});
const round=(n,k=10)=>Math.round(n*k)/k;

// Per frame: ball centre x/y and radius in render pixels (r 0 = out of frame), the unit view direction
// from the ball to the camera, the depth-of-field blur sigma in render pixels and the candle flicker.
export function trackFrame(f,ballWorld,width){
 if(!f.ball_in_frame)return [0,0,0,0,0,1,0,0];
 const d=f.cam_location.map((c,i)=>c-ballWorld[i]),len=Math.hypot(...d);
 // Thin lens on Blender's 36 mm horizontal sensor: circle of confusion, as a Gaussian sigma (disc radius / sqrt 2).
 const focal=18/Math.tan(f.hfov_deg*Math.PI/360),focus=f.focus_m*1000,depth=f.ball_depth_m*1000;
 const coc=(focal/f.fstop)*(focal/(focus-focal))*Math.abs(depth-focus)/depth*width/36;
 return [round(f.ball_px[0]),round(f.ball_px[1]),round(f.ball_radius_px),...d.map(v=>round(v/len,1000)),round(coc/2/Math.SQRT2),round(f.flicker,1000)];
}

// The Plus art from the local-AI bake-off entry (Z-Image Turbo, Depth Anything and Blender; its report.md has the recipe):
// the Inner Library's push-in from the chamber to the tome, and each ball style's still in the Ask spot's ring stand.
const plusSource='/Users/janustsen/dev/archive/crystal-ball-bakeoff/pipeline';
export const ballStyles=['smoke','aurora','obsidian','gold'];
const styleRender={smoke:'smoke',aurora:'aurora',obsidian:'obsidian',gold:'gold-flecked'};
// The style renders keep the Ask still's ball: centre (585,1266), radius 173 px.
const ball={x:585,y:1266,r:173};
function plus(src,track){
 // The chamber holds no ball, so its frames carry none (the push-in camera file still lists the room's ball).
 const frames=JSON.parse(readFileSync(join(src,'camera','inner-library-pushin.json'),'utf8')).frames.length;
 track.stills.library=[0,0,0,0,0,1,0,0];
 track.clips['home-library']=Array.from({length:frames},()=>track.stills.library);
 // The push-in ends on the bundled resting still; it ships in the bundle like the other flights.
 ffmpeg('-i',join(src,'frames',`pushin_f${String(frames-1).padStart(4,'0')}.png`),'-q:v','4','assets/room/library.jpg');
 ffmpeg('-i',join(src,'inner-library-pushin_1170x2532_30fps.mp4'),...h264,join(flights,'home-library.mp4'));
 mkdirSync('assets/styles',{recursive:true});
 for(const style of ballStyles){
  const still=join(src,`ball-${styleRender[style]}_1170x2532.png`),d=ball.r*2;
  // glass: the ball's disc as rendered, the live ball at rest. clean: the same disc with its glints (blobs whiter than
  // the local median in every channel) filled from that median: the interior a spin turns, while the glints stay put.
  // preview: the ball on its stand, for the picker.
  const disc=`crop=${d}:${d}:${ball.x-ball.r}:${ball.y-ball.r},scale=384:384:flags=lanczos`,white='clip((min(min(r(X\\,Y)\\,g(X\\,Y))\\,b(X\\,Y))-30)*5\\,0\\,255)';
  ffmpeg('-i',still,'-vf',disc,'-q:v','3',`assets/styles/${style}-glass.jpg`);
  ffmpeg('-i',still,'-filter_complex',`[0]${disc},format=gbrp,split=3[o][m][w];[m]median=radius=40,split[bg][bg2];`+
   `[w][bg2]blend=all_mode=subtract,geq=r='${white}':g='${white}':b='${white}',erosion,erosion,${'dilation,'.repeat(14)}gblur=sigma=4[k];`+
   '[o][bg][k]maskedmerge,format=yuvj444p','-q:v','3',`assets/styles/${style}-clean.jpg`);
  ffmpeg('-i',still,'-vf',`crop=420:560:${ball.x-210}:${ball.y-ball.r-40},scale=180:240:flags=lanczos`,'-q:v','4',`assets/styles/${style}-preview.jpg`);
 }
}

// The Ask still's relief tears into blocky steps above the ring and around the stand's neck, where the live ball does
// not cover them. Each feathered box (x0,y0,x1,y1,feather in render px) is replaced: the top one by the shelves 110 px
// to its right, the neck by a 4 px blur of itself.
const box=([x0,y0,x1,y1,f])=>{const a=`255*clip(min(min(X-${x0},${x1}-X),min(Y-${y0},${y1}-Y))/${f},0,1)`;return `geq=r='${a}':g='${a}':b='${a}'`};
const askRepair=`[0]format=gbrp,split=4[o][s][g][m];[s]crop=1060:2532:110:0,pad=1170:2532:0:0[shelf];[g]gblur=sigma=4[soft];`+
 `[m]split[mt][ms];[mt]${box([595,1035,720,1108,12])}[top];[ms]${box([425,1395,745,1560,10])}[neck];`+
 '[o][shelf][top]maskedmerge[r];[r][soft][neck]maskedmerge,format=yuvj444p';

function build(src,plusSrc=process.env.PLUS_RENDER_SOURCE||plusSource){
 mkdirSync('assets/room',{recursive:true});
 mkdirSync(join(streamed,roomVersion),{recursive:true});
 mkdirSync(flights,{recursive:true});
 const track={version:roomVersion,width:0,height:0,stills:{},clips:{}};
 const load=name=>JSON.parse(readFileSync(join(src,'camera',`${name}.json`),'utf8'));
 for(const spot of spots){
  ffmpeg('-i',join(src,'stills',`${spot}_1170x2532.png`),...spot==='ask'?['-filter_complex',askRepair]:[],'-q:v','4',`assets/room/${spot}.jpg`);
  const still=load(`still_${spot}`);
  [track.width,track.height]=still.res;
  track.stills[spot]=trackFrame(still.frames[0],still.ball_world,still.res[0]);
  const idle=load(`idle_${spot}`);
  track.clips[`idle-${spot}`]=idle.frames.map(f=>trackFrame(f,idle.ball_world,idle.res[0]));
  // Home's loop ships in the bundle so the first screen is alive offline; the rest stream.
  ffmpeg('-i',join(src,'idle',`${spot}_idle_1170x2532_30fps.mp4`),...h264,spot==='home'?'assets/room/home-idle.mp4':join(streamed,roomVersion,`idle-${spot}.mp4`));
  for(const to of spots){
   if(to===spot)continue;
   const flight=load(`flight_${spot}_${to}`);
   track.clips[`${spot}-${to}`]=flight.frames.map(f=>trackFrame(f,flight.ball_world,flight.res[0]));
   // Flights ship in the bundle so a tab change can always fly, on web and native, with no clip host.
   ffmpeg('-i',join(src,'flights',`${spot}_to_${to}_1170x2532_30fps.mp4`),...h264,join(flights,`${spot}-${to}.mp4`));
  }
 }
 plus(plusSrc,track);
 writeFileSync('src/roomTrack.json',JSON.stringify(track)+'\n');
}

const [command,arg]=process.argv.slice(2);
if(command==='build'&&arg)build(arg,process.argv[4]);
else if(command==='sync'&&arg){
 if(!existsSync(streamed))build(process.env.ROOM_RENDER_SOURCE||'/Users/janustsen/dev/archive/crystal-ball-room/v2');
 execFileSync('rsync',['-a',`${streamed}/`,`${arg.replace(/\/$/,'')}/`],{stdio:'inherit'});
}
else if(command){console.error('usage: room-assets.mjs build <v2 render dir> [plus dir] | sync <destination>');process.exit(1)}
