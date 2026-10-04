// One-step painted asset generation for the witch's-house concepts. See docs/art/asset-pipeline.md.
// Usage: node docs/ux-loop/witch-thesis/generate-art.mjs [assetName ...]   (default: all missing assets)
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import sharp from 'sharp';

const model=process.env.GEMINI_IMAGE_MODEL||'gemini-2.5-flash-image';
const out='public/concepts/witch-assets/art',raw='.local/witch-art-raw',ledger='docs/art/provenance.json';
const style='Hand-painted storybook illustration, gouache and ink with fine engraved line detail, slightly exaggerated cartoon proportions with rich volumetric depth, aged and worn materials, intricate hand-carved ornament, visible brush texture, warm amber candlelight from the left, deep umber and plum shadows, muted gold highlights. No text, no letters, no watermark, no logo, no border. Single isolated object, centred, fully in frame.';
const light='Painted as glowing light only, on a perfectly flat pure black #000000 background with nothing else.';
const solid='On a perfectly flat, uniform chroma magenta #FF00FF background with no shadow on the background.';
const backdrop='Painted edge to edge as a full scene, tall portrait composition, dim and atmospheric so lettering can sit on it.';
// [name, kind, aspect, size(px at 3x, longest edge), subject]
const shared=[
 ['ball-interior','solid','1:1',783,'The dark interior of an empty glass sphere seen straight on: deep smoky amber depth, a faint swirling nebula, soft inner shadow at the edges, no reflections or highlights, perfect circle filling the frame.'],
 ['ball-smoke-a','light','1:1',783,'Curling wisps of luminous golden smoke drifting in a slow spiral, soft and translucent.'],
 ['ball-smoke-b','light','1:1',783,'Thin ribbons of pale amber smoke rising and folding over themselves, delicate.'],
 ['ball-smoke-c','light','1:1',783,'A faint cloud of glittering gold dust and haze, very soft.'],
 ['ball-glass','light','1:1',783,'Only the reflections on an empty glass sphere: a curved window highlight top left, a thin crescent rim light on the right edge, tiny surface scratches and a soft caustic, everything else black.'],
 ['reveal-shards','light','1:1',1200,'Shards of glowing glass and golden sparks bursting outward from the centre, motion streaks.'],
 ['reveal-glow','light','1:1',1200,'A soft golden bloom with gentle rays radiating from the centre.'],
 ['candle-body','solid','3:4',480,'A short thick beeswax candle with long uneven wax drips standing in a small dented iron dish, wick unlit.'],
 ['candle-flame','light','3:4',360,'A single candle flame with a small blue base and warm orange tip.'],
 ['question-slip','solid','4:3',720,'A small torn parchment slip with ragged edges, tied at one corner with rough twine, completely blank.'],
];
const concepts={
 a:{stand:'A dark walnut crystal-ball stand carved with crescent moons and vines, resting on three owl claw feet, worn edges.',backdrop:'A candlelit wall of old dark wooden planks with carved shelves holding jars in deep shadow, dust in the air.',table:'The front edge of a thick, worn dark wooden tabletop seen from slightly above, wax drips and knife marks, wide panoramic strip.',panel:'A chipped hand-carved dark wooden plaque with bevelled uneven edges and iron nails at the corners, blank.','price-tag':'A small round brass medallion with an engraved border, blank centre.','history-jar':'A small glass jar with a cork stopper holding a curl of glowing smoke.',charms:['a carved wooden token showing a quill crossed with an old key','a carved wooden token showing two lit candles','a carved wooden token showing an open spellbook','a carved wooden token showing a sprouting seed']},
 b:{stand:'A brass and glass apothecary crystal-ball stand with etched rings, small claw feet and a blank brass label plate.',backdrop:'Floor-to-ceiling apothecary shelves crowded with bottles and drawers, in soft focus and warm shadow.',table:'The front edge of a marble-topped apothecary counter with brass trim, wide panoramic strip.',panel:'An aged parchment label with torn edges and small brass corner caps, blank.','price-tag':'A small paper price tag on a loop of string, blank.','history-jar':'A small apothecary bottle with a wax-sealed cork and a blank paper label.',charms:['a small apothecary bottle holding a quill and a key','a small apothecary bottle holding two tiny candles','a small apothecary bottle holding a tiny open book','a small apothecary bottle holding a sprouting seed']},
 c:{stand:'A chunky painted wooden crystal-ball stand decorated with tiny toadstools and moss, rounded cartoon proportions.',backdrop:'A cosy cottage interior at night: a round window with stars, a glowing hearth, hanging dried herbs, rounded wonky walls.',table:'The front edge of a rounded painted wooden table with a lace cloth hanging over it, wide panoramic strip.',panel:'A painted wooden sign hanging from rope with wonky rounded edges, blank.','price-tag':'A small wooden heart-shaped tag on a ribbon, blank.','history-jar':'A round glass jar with a ribbon around its neck and a single glowing firefly inside.',charms:['a painted icon of a quill and a key','a painted icon of two lit candles','a painted icon of an open spellbook','a painted icon of a sprouting seed in a pot']},
};
const assets=[...shared];
for(const [id,c] of Object.entries(concepts)){
 assets.push([`${id}-stand`,'solid','1:1',783,c.stand],[`${id}-backdrop`,'backdrop','9:16',2796,c.backdrop],[`${id}-table`,'solid','21:9',1290,c.table],[`${id}-panel`,'solid','16:9',1170,c.panel],[`${id}-price-tag`,'solid','1:1',360,c['price-tag']],[`${id}-history-jar`,'solid','3:4',360,c['history-jar']]);
 ['work','love','learning','fresh'].forEach((topic,i)=>assets.push([`${id}-charm-${topic}`,'solid','1:1',360,c.charms[i]]));
}

async function key(){
 if(process.env.GEMINI_API_KEY)return process.env.GEMINI_API_KEY;
 const text=await readFile(`${homedir()}/.config/gemini/env`,'utf8');
 const match=text.match(/^\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*["']?([^"'\s]+)/m);
 if(!match)throw Error('GEMINI_API_KEY not found in ~/.config/gemini/env');
 return match[1];
}
async function generate(apiKey,prompt,aspect){
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:['IMAGE'],imageConfig:{aspectRatio:aspect}}})});
 const body=await response.json();
 if(!response.ok)throw Error(`${response.status} ${body.error?.message||'image request failed'}`);
 const part=body.candidates?.[0]?.content?.parts?.find(p=>p.inlineData);
 if(!part)throw Error('No image in response: '+JSON.stringify(body.candidates?.[0]?.finishReason||body.promptFeedback||{}));
 return Buffer.from(part.inlineData.data,'base64');
}
// Light layers: luminance becomes alpha so they composite with screen/normal blending.
async function keyLight(buffer){
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4){const l=Math.max(data[i],data[i+1],data[i+2]);data[i+3]=l<8?0:l;if(l){data[i]=Math.min(255,data[i]*255/l);data[i+1]=Math.min(255,data[i+1]*255/l);data[i+2]=Math.min(255,data[i+2]*255/l)}}
 return sharp(data,{raw:info}).png().toBuffer();
}
// Solid objects: remove the magenta field, soften the edge and pull magenta spill out of fringe pixels.
async function keySolid(buffer){
 // Gemini web can add an unrequested white margin outside the chroma field.
 const margin=await sharp(buffer).trim({threshold:15}).toBuffer();
 const dimensions=await sharp(margin).metadata();
 const trimmed=await sharp(margin).extract({left:3,top:3,width:dimensions.width-6,height:dimensions.height-6}).toBuffer();
 const {data,info}=await sharp(trimmed).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=0;i<data.length;i+=4){const [r,g,b]=[data[i],data[i+1],data[i+2]],spill=Math.min(r,b)-g;
  if(spill>90&&r>150&&b>150)data[i+3]=0;else if(spill>30){data[i+3]=Math.max(0,255-(spill-30)*4);data[i]=data[i+2]=Math.min(r,b,g+30)}}
 return sharp(data,{raw:info}).trim({threshold:1}).png().toBuffer();
}
const args=process.argv.slice(2);
const prompts=assets.map(([name,kind,aspect,size,subject])=>({name,kind,aspect,size,prompt:`${style} ${subject} ${kind==='light'?light:kind==='solid'?solid:backdrop}`}));
if(args.includes('--prompts')){console.log(JSON.stringify(prompts));process.exit(0)}
const importing=args.includes('--import');
const want=new Set(args.filter(a=>a!=='--import'));
await mkdir(out,{recursive:true});await mkdir(raw,{recursive:true});
let provenance=await readFile(ledger,'utf8').then(JSON.parse).catch(()=>[]);
const apiKey=importing?null:await key();
for(const [name,kind,aspect,size,subject] of assets){
 if(want.size?!want.has(name):await access(`${out}/${name}@3x.webp`).then(()=>true,()=>false))continue;
 const prompt=`${style} ${subject} ${kind==='light'?light:kind==='solid'?solid:backdrop}`;
 let image=importing?await readFile(`${raw}/${name}.png`):null,attempt=0;
 for(;attempt<3&&!image;attempt++)try{image=await generate(apiKey,prompt,aspect)}catch(error){console.error(name,'attempt',attempt+1,error.message)}
 if(!image){console.error('FAILED',name);continue}
 await writeFile(`${raw}/${name}.png`,image);
 const keyed=kind==='light'?await keyLight(image):kind==='solid'?await keySolid(image):image;
 for(const [scale,factor] of [['3x',1],['2x',2/3],['1x',1/3]]){
  const meta=await sharp(keyed).metadata(),long=Math.round(size*factor),fit=meta.width>=meta.height?{width:long}:{height:long};
  await sharp(keyed).resize({...fit,withoutEnlargement:true}).webp({quality:82,alphaQuality:90}).toFile(`${out}/${name}@${scale}.webp`);
 }
 provenance=provenance.filter(p=>p.file!==`${name}@{1x,2x,3x}.webp`);
 provenance.push({source:importing?'Gemini web, authorized Temporary chat, Pro selected; underlying image model not exposed':'Gemini API',file:`${name}@{1x,2x,3x}.webp`,model:importing?'Gemini web (undisclosed image model)':model,prompt,aspect,kind,date:new Date().toISOString(),attempts:attempt,rawSha256:createHash('sha256').update(image).digest('hex'),processing:kind==='light'?'luminance to alpha, resize, WebP q82':kind==='solid'?'outer margin trim plus 3px fringe crop, magenta chroma key, spill suppression, trim, resize, WebP q82':'resize, WebP q82'});
 await writeFile(ledger,JSON.stringify(provenance,null,1)+'\n');
 console.log('generated',name);
}
