// Procedural, original textures for the witch's-house concepts (no third-party art).
import sharp from 'sharp';
const out='public/concepts/witch-assets';
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
function planks(w,h,{base,dark,light,count,vertical=false,freq='0.006 0.18'}){
 // Uneven plank widths, each with its own grain offset and a dark hand-cut seam.
 let x=0,rects='';const span=vertical?w:h;
 while(x<span){const size=span/count*(0.75+rnd()*0.5),tone=Math.round(rnd()*28-14);
  rects+=vertical?`<rect x="${x}" y="0" width="${size}" height="${h}" fill="${base}" style="filter:brightness(${1+tone/100})"/><path d="M${x} 0 ${Array.from({length:12},(_,i)=>`L${x+(rnd()*3-1.5)} ${(i+1)*h/12}`).join(' ')}" stroke="${dark}" stroke-width="${2+rnd()*2}" fill="none"/>`
  :`<rect x="0" y="${x}" width="${w}" height="${size}" fill="${base}" opacity="${0.85+rnd()*.15}"/><path d="M0 ${x} ${Array.from({length:12},(_,i)=>`L${(i+1)*w/12} ${x+(rnd()*3-1.5)}`).join(' ')}" stroke="${dark}" stroke-width="${2+rnd()*2}" fill="none"/>`;
  // knots
  if(rnd()>.45){const cx=vertical?x+size*rnd():w*rnd(),cy=vertical?h*rnd():x+size*rnd();rects+=`<ellipse cx="${cx}" cy="${cy}" rx="${vertical?5:14}" ry="${vertical?14:5}" fill="${dark}" opacity=".55"/><ellipse cx="${cx}" cy="${cy}" rx="${vertical?9:24}" ry="${vertical?24:9}" fill="none" stroke="${dark}" opacity=".25"/>`}
  x+=size}
 const f=vertical?freq.split(' ').reverse().join(' '):freq;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="4" seed="${Math.round(rnd()*99)}"/><feColorMatrix values="0 0 0 0 ${parseInt(light.slice(1,3),16)/255} 0 0 0 0 ${parseInt(light.slice(3,5),16)/255} 0 0 0 0 ${parseInt(light.slice(5,7),16)/255} 0 0 0 1.4 -0.55"/></filter></defs>${rects}<rect width="${w}" height="${h}" filter="url(#g)" opacity=".55"/></svg>`;
}
const parchment=(w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><filter id="p"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="5" seed="3"/><feColorMatrix values="0 0 0 0 .45 0 0 0 0 .3 0 0 0 0 .14 0 0 0 1.1 -.35"/></filter><filter id="f"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 .3 0 0 0 0 .2 0 0 0 0 .1 0 0 0 .6 -.2"/></filter><radialGradient id="v" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#4a2e12" stop-opacity=".55"/></radialGradient></defs><rect width="100%" height="100%" fill="#e6d3ae"/><rect width="100%" height="100%" filter="url(#p)" opacity=".7"/><rect width="100%" height="100%" filter="url(#f)" opacity=".35"/><rect width="100%" height="100%" fill="url(#v)"/></svg>`;
const plaster=(w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><filter id="b"><feTurbulence type="fractalNoise" baseFrequency=".006 .009" numOctaves="4" seed="12"/><feColorMatrix values="0 0 0 0 .32 0 0 0 0 .3 0 0 0 0 .42 0 0 0 1.2 -.4"/></filter><filter id="s"><feTurbulence type="turbulence" baseFrequency=".05 .9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .1 0 0 0 0 .06 0 0 0 0 .04 0 0 0 .9 -.4"/></filter></defs><rect width="100%" height="100%" fill="#1f2333"/><rect width="100%" height="100%" filter="url(#b)" opacity=".5"/><rect width="100%" height="100%" filter="url(#s)" opacity=".18"/></svg>`;
const jobs={
 'wood-wall.png':planks(780,1688,{base:'#3a2414',dark:'#120904',light:'#6b4526',count:6,vertical:true}),
 'wood-table.png':planks(780,600,{base:'#5a3a20',dark:'#1d1006',light:'#9a6a3c',count:4}),
 'wood-panel.png':planks(780,400,{base:'#4a2f1a',dark:'#160b04',light:'#8a5c34',count:3}),
 'shelf-wall.png':planks(780,1688,{base:'#2c1d14',dark:'#0c0603',light:'#5a3c26',count:9}),
 'parchment.png':parchment(780,780),
 'plaster.png':plaster(780,1688),
};
for(const [name,svg] of Object.entries(jobs)){await sharp(Buffer.from(svg)).jpeg({quality:80,mozjpeg:true}).toFile(`${out}/${name.replace('.png','.jpg')}`);console.log(name)}
