// Compose the same painted ball layers used by OrbVisual for the exported story card.
import sharp from 'sharp';
const root='assets/apothecary';
// Preserve chipped edges while lifting the writing area out of the painted shadow.
const {data:paper,info:paperInfo}=await sharp('public/concepts/witch-assets/art/b-panel@3x.webp').resize({width:700,withoutEnlargement:true}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let y=0;y<paperInfo.height;y++)for(let x=0;x<paperInfo.width;x++){
 const i=(y*paperInfo.width+x)*4;
 const weight=Math.max(0,Math.min(1,(Math.min(x,paperInfo.width-1-x)-45)/35,(Math.min(y,paperInfo.height-1-y)-28)/25));
 const grain=(paper[i]+paper[i+1]+paper[i+2])/3;
 for(let c=0;c<3;c++)paper[i+c]=Math.round(paper[i+c]*(1-weight)+([222,199,162][c]+(grain-140)*.12)*weight);
}
await sharp(paper,{raw:paperInfo}).webp({quality:88}).toFile(`${root}/paper.webp`);
async function faded(file,opacity){const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let i=3;i<data.length;i+=4)data[i]=Math.round(data[i]*opacity);return sharp(data,{raw:info}).png().toBuffer()}
const interior=await sharp(`${root}/interior.webp`).resize(652,652).extract({left:59,top:59,width:534,height:534}).toBuffer();
const smoke=await sharp(await faded(`${root}/smoke.webp`,.2)).resize(534,534).toBuffer();
const glass=await sharp(await faded(`${root}/glass.webp`,.85)).resize(534,534).toBuffer();
const mask=Buffer.from('<svg width="534" height="534"><circle cx="267" cy="267" r="267" fill="white"/></svg>');
const sphere=await sharp(interior).composite([{input:smoke},{input:glass},{input:mask,blend:'dest-in'}]).png().toBuffer();
const stand=await sharp(`${root}/stand.webp`).resize(480,237,{fit:'fill'}).toBuffer();
await sharp({create:{width:600,height:675,channels:4,background:'#00000000'}}).composite([{input:stand,left:60,top:438},{input:sphere,left:33,top:0}]).png().toFile(`${root}/orb.png`);
console.log('Composed painted story orb: 600 × 675');
