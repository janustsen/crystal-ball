// Encodes the approved room renders for the app and syncs the streamed clips to their host.
//   node scripts/room-assets.mjs build <v2 render dir>   bundled stills + Home loop, ball track, streamed clips in .local/room-assets
//   node scripts/room-assets.mjs sync <destination>      rsync the streamed clips (a local path such as public/room, or host:path)
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

export const spots=['home','sky','ask','history','you'];
// Bump with the renders: the version is part of every streamed URL, so caches never mix two room builds.
export const roomVersion='v2';
const streamed='.local/room-assets';
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

function build(src){
 mkdirSync('assets/room',{recursive:true});
 mkdirSync(join(streamed,roomVersion),{recursive:true});
 const track={version:roomVersion,width:0,height:0,stills:{},clips:{}};
 const load=name=>JSON.parse(readFileSync(join(src,'camera',`${name}.json`),'utf8'));
 for(const spot of spots){
  ffmpeg('-i',join(src,'stills',`${spot}_1170x2532.png`),'-q:v','4',`assets/room/${spot}.jpg`);
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
   ffmpeg('-i',join(src,'flights',`${spot}_to_${to}_1170x2532_30fps.mp4`),...h264,join(streamed,roomVersion,`${spot}-${to}.mp4`));
  }
 }
 writeFileSync('src/roomTrack.json',JSON.stringify(track)+'\n');
}

const [command,arg]=process.argv.slice(2);
if(command==='build'&&arg)build(arg);
else if(command==='sync'&&arg)execFileSync('rsync',['-a',`${streamed}/`,`${arg.replace(/\/$/,'')}/`],{stdio:'inherit'});
else if(command){console.error('usage: room-assets.mjs build <v2 render dir> | sync <destination>');process.exit(1)}
