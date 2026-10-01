// Bake seamless noise and transparent glass once; native animates only transforms/opacity.
import sharp from 'sharp';
import {orbArtwork} from '../src/orbArtwork.ts';
for (const [index,seed] of [7,19,43].entries()) {
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="fog" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".016 .023" numOctaves="3" seed="${seed}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .96 0 0 0 0 .88 0 0 0 0 .75 2.8 0 0 0 -1.05"/></filter><rect width="256" height="256" filter="url(#fog)"/></svg>`;
 await sharp(Buffer.from(svg)).png().toFile(`assets/fog-${index}.png`);
}
const glass=orbArtwork.replace(/<circle cx="100" cy="100" r="100"[^>]*\/>/,'').replace(/<g clip-path="url\(#sphere\)" opacity=".65">[\s\S]*?<\/svg><\/g>/,'');
await sharp(Buffer.from(glass)).resize(600,675).png().toFile('assets/orb-glass.png');
const fade=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><radialGradient id="fade"><stop stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect width="256" height="256" fill="url(#fade)"/></svg>');
await sharp('assets/fog-1.png').composite([{input:fade,blend:'dest-in'}]).png().toFile('assets/fog-wisp.png');
