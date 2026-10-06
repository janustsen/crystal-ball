import track from './roomTrack.json';

// The approved library room (renders built by scripts/room-assets.mjs). Each tab is a spot in it; Library is the Plus
// Inner Library behind it, reached by its push-in from Home.
export type Spot='Home'|'Sky'|'Ask'|'History'|'You'|'Library';
// A ball frame: centre x/y and radius in render pixels (radius 0 = out of frame), the unit direction from the
// ball to the camera, the depth-of-field blur sigma in render pixels and the candle flicker.
export type BallFrame=number[];
export const roomFps=30;

// Flights and the other loops stream from here; unset means tab changes cut straight to the stills.
export const roomAssetBase=(process.env.EXPO_PUBLIC_ROOM_ASSET_BASE??'').replace(/\/+$/,'');
export const roomVersion=track.version;

export const flightKey=(from:Spot,to:Spot)=>`${from.toLowerCase()}-${to.toLowerCase()}`;
export const idleKey=(spot:Spot)=>`idle-${spot.toLowerCase()}`;
export const clipUrl=(key:string)=>`${roomAssetBase}/${roomVersion}/${key}.mp4`;
export const clipFrames=(key:string):BallFrame[]=>(track.clips as Record<string,BallFrame[]>)[key]??[];
export const stillFrame=(spot:Spot):BallFrame=>(track.stills as Record<string,BallFrame>)[spot.toLowerCase()];
// The largest radius any clip gives the ball, so one overlay canvas covers every frame without upscaling.
export const maxBallRadius=Math.max(...Object.values(track.clips).flat().map(f=>f[2]));

// The renders fill the room like CSS object-fit: cover.
export function roomCover(width:number,height:number){
 const scale=Math.max(width/track.width,height/track.height);
 return {scale,x:(width-track.width*scale)/2,y:(height-track.height*scale)/2};
}
export function ballOnScreen(frame:BallFrame,width:number,height:number){
 if(!frame[2])return null;
 const {scale,x,y}=roomCover(width,height);
 return {x:x+frame[0]*scale,y:y+frame[1]*scale,r:frame[2]*scale,dir:frame.slice(3,6),blur:frame[6]*scale,flicker:frame[7]};
}

// Where a spot's screen content starts, as a share of the height, so the spot's focal object stays in view
// (the canvas artboards dock their controls low). Home and Ask start below the ball itself.
const contentShare:Record<Spot,number>={Home:0,Sky:.48,Ask:0,History:.5,You:.6,Library:.6};
export function contentTop(spot:Spot,width:number,height:number){
 const ball=spot==='Home'||spot==='Ask'?ballOnScreen(stillFrame(spot),width,height):null;
 return ball?Math.round(ball.y+ball.r+16):Math.round(height*contentShare[spot]);
}
