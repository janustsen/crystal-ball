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

// Room surfaces the UI can sit on (scripts/room-assets.mjs anchors): each a quad (four corners, top-left clockwise, in
// render pixels) on its spot's still and on every frame of that spot's idle loop.
export type Anchor='skylight'|'desk';
type AnchorTrack={spot:string;still:number[];idle:number[][]};
const anchorTracks=(track as unknown as {anchors:Record<Anchor,AnchorTrack>}).anchors;
export const anchorSpot=(anchor:Anchor)=>anchorTracks[anchor].spot as Lowercase<Spot>;
// The anchor's quad on screen, at an idle-loop frame or (null) on the still.
export function anchorOnScreen(anchor:Anchor,frame:number|null,width:number,height:number){
 const a=anchorTracks[anchor],q=frame===null||!a.idle.length?a.still:a.idle[frame%a.idle.length],{scale,x,y}=roomCover(width,height);
 return [0,1,2,3].map(i=>[x+q[i*2]*scale,y+q[i*2+1]*scale]) as [number,number][];
}
export function quadBox(quad:[number,number][]){
 const xs=quad.map(p=>p[0]),ys=quad.map(p=>p[1]);
 return {left:Math.min(...xs),top:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
}
// The projective transform taking a width × height box (origin top-left) onto a quad, as a CSS matrix3d (column-major).
export function quadMatrix(width:number,height:number,quad:[number,number][]){
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=quad;
 const dx1=x1-x2,dx2=x3-x2,dy1=y1-y2,dy2=y3-y2,sx=x0-x1+x2-x3,sy=y0-y1+y2-y3,det=dx1*dy2-dx2*dy1;
 const g=(sx*dy2-dx2*sy)/det,h=(dx1*sy-sx*dy1)/det;
 const a=x1-x0+g*x1,b=x3-x0+h*x3,c=x0,d=y1-y0+g*y1,e=y3-y0+h*y3,f=y0;
 // Unit square → quad, then scaled from the box to the unit square.
 return [a/width,d/width,0,g/width, b/height,e/height,0,h/height, 0,0,1,0, c,f,0,1];
}
