// Builds the interim UI materials from the approved room stills: each is a real crop of the room, toned so the app's
// text stays legible on it and feathered out at the edges, until the modeled component kit replaces it.
//   node scripts/material-placeholders.mjs        writes assets/materials/*.png and manifest.json
// A kit drop replaces a material by writing its own file and insets into assets/materials/manifest.json (see src/materials.ts).
import sharp from 'sharp';
import {mkdirSync,writeFileSync} from 'node:fs';

const out='assets/materials',scale=3,feather=36;
// crop: [left, top, width, height] in the 1170×2532 stills. ink: the text colour the app sets on it, and the toning
// must keep that text at 4.5:1 or better against the crop's worst 5% of pixels.
const recipes={
 'parchment-note':{still:'library',crop:[340,1230,440,130],size:[360,150],tone:{brightness:.32,saturation:.75},ink:'muted'},
 'oak-panel':{still:'library',crop:[340,1500,460,600],size:[360,360],tone:{brightness:.42,saturation:.9},ink:'muted',states:{selected:{brightness:.85,saturation:1.1}}},
 'wax-card':{still:'library',crop:[0,1460,260,260],size:[300,420],tone:{brightness:.24,saturation:.7},ink:'muted'},
 'brass-plaque':{still:'library',crop:[380,1250,380,100],size:[360,150],tone:{brightness:1.05,saturation:.8},ink:'ink',states:{pressed:{brightness:.9,saturation:.8},disabled:{brightness:.3,saturation:.3}}},
 'engraved-button':{still:'ask',crop:[100,2000,900,300],size:[360,150],tone:{brightness:.9,saturation:.85},ink:'ivory',states:{pressed:{brightness:.7,saturation:.8},disabled:{brightness:.3,saturation:.2}}},
 'leather-strip':{still:'you',crop:[470,1000,280,120],size:[360,150],tone:{brightness:.6,saturation:.85},ink:'muted',states:{selected:{brightness:.95,saturation:1}}},
 'glass-input':{still:'you',crop:[100,2200,800,300],size:[360,180],tone:{brightness:.42,saturation:.8},ink:'muted'},
};
const inks={ivory:[241,233,220],muted:[185,171,151],ink:[18,14,11]};
const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);

// Edge alpha: the crop fades to nothing across the inset band, so the sliced corners and edges keep their width at any size.
function feathered({data,info}){
 const {width:w,height:h}=info;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const d=Math.min(x,y,w-1-x,h-1-y)/feather,t=Math.min(1,d);
  data[(y*w+x)*4+3]=Math.round(255*t*t*(3-2*t));
 }
 return data;
}

async function render(recipe,tone){
 const [left,top,width,height]=recipe.crop,[w,h]=recipe.size;
 const raw=await sharp(`assets/room/${recipe.still}.jpg`).extract({left,top,width,height}).resize(w,h,{fit:'fill'})
  .modulate(tone).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Contrast over the opaque centre only: the feathered band sits under padding, never under text.
 const lums=[];
 for(let y=feather;y<h-feather;y++)for(let x=feather;x<w-feather;x++){const i=(y*w+x)*4;lums.push(luminance([raw.data[i],raw.data[i+1],raw.data[i+2]]))}
 lums.sort((a,b)=>a-b);
 const ink=luminance(inks[recipe.ink]),worst=recipe.ink==='ink'?lums[Math.floor(lums.length*.05)]:lums[Math.floor(lums.length*.95)];
 return {png:await sharp(feathered(raw),{raw:{width:w,height:h,channels:4}}).png({compressionLevel:9,palette:false}).toBuffer(),contrast:ratio(ink,worst)};
}

mkdirSync(out,{recursive:true});
const materials={},failures=[];
for(const [name,recipe] of Object.entries(recipes)){
 const entry={file:`${name}.png`,width:recipe.size[0],height:recipe.size[1],insets:{top:feather,right:feather,bottom:feather,left:feather},fill:'stretch',placeholder:`room ${recipe.still} crop ${recipe.crop.join(',')}`};
 for(const [state,tone] of [['base',recipe.tone],...Object.entries(recipe.states??{})]){
  const {png,contrast}=await render(recipe,tone),file=state==='base'?entry.file:`${name}-${state}.png`;
  writeFileSync(`${out}/${file}`,png);
  if(state!=='base')(entry.states??={})[state]=file;
  // Disabled controls dim their label on purpose; every other state must stay legible.
  if(state!=='disabled'&&contrast<4.5)failures.push(`${file} ${recipe.ink} text ${contrast.toFixed(2)}:1`);
  console.log(`${file.padEnd(28)} ${recipe.ink} ${contrast.toFixed(2)}:1`);
 }
 materials[name]=entry;
}
writeFileSync(`${out}/manifest.json`,JSON.stringify({version:1,scale,materials},null,1)+'\n');
if(failures.length){console.error('Below 4.5:1:',failures.join('; '));process.exitCode=1}
