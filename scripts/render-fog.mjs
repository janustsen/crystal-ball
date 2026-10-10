// Bake seamless noise and transparent glass once; native animates only transforms/opacity.
import sharp from 'sharp';
import {orbArtwork} from '../src/orbArtwork.ts';
// Fractal Perlin noise on a lattice that wraps at the tile's edge, so the tiles repeat without a seam (librsvg's
// feTurbulence stitching does not), mapped through the old filter's colour and alpha ramp.
function fog(seed,size=256,periods=[4,6],octaves=3){
 let state=seed;
 const rnd=()=>{state=(state*16807)%2147483647;return state/2147483647};
 const angles=Array.from({length:octaves},(_,o)=>Array.from({length:periods[0]*periods[1]<<2*o},()=>rnd()*Math.PI*2));
 const fade=t=>t*t*t*(t*(t*6-15)+10);
 const perlin=(x,y,o)=>{
  const px=periods[0]<<o,py=periods[1]<<o,u=x*px,v=y*py,ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy;
  const dot=(cx,cy)=>{const a=angles[o][((iy+cy)%py)*px+(ix+cx)%px];return Math.cos(a)*(fx-cx)+Math.sin(a)*(fy-cy)};
  const sx=fade(fx),sy=fade(fy),top=dot(0,0)+(dot(1,0)-dot(0,0))*sx,bottom=dot(0,1)+(dot(1,1)-dot(0,1))*sx;
  return top+(bottom-top)*sy;
 };
 const data=Buffer.alloc(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let n=0;for(let o=0;o<octaves;o++)n+=perlin(x/size,y/size,o)/(1<<o);
  data.set([252,240,226,Math.round(255*Math.min(1,Math.max(0,2.8*(n*.45+.52)-1.05)))],(y*size+x)*4);
 }
 return sharp(data,{raw:{width:size,height:size,channels:4}});
}
for (const [index,seed] of [7,19,43].entries()) await fog(seed).png().toFile(`assets/fog-${index}.png`);
const glass=orbArtwork.replace(/<circle cx="100" cy="100" r="100"[^>]*\/>/,'').replace(/<g clip-path="url\(#sphere\)" opacity=".65">[\s\S]*?<\/svg><\/g>/,'');
await sharp(Buffer.from(glass)).resize(600,675).png().toFile('assets/orb-glass.png');
const fade=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><radialGradient id="fade"><stop stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect width="256" height="256" fill="url(#fade)"/></svg>');
await sharp('assets/fog-1.png').composite([{input:fade,blend:'dest-in'}]).png().toFile('assets/fog-wisp.png');
