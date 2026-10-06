import type {Spot} from './room';
import type {BallStyle} from './types';

// Bundled room media (scripts/room-assets.mjs): every spot's still and Home's living loop.
export const roomStills:Record<Spot,number>={
 Home:require('../assets/room/home.jpg'),Sky:require('../assets/room/sky.jpg'),Ask:require('../assets/room/ask.jpg'),
 History:require('../assets/room/history.jpg'),You:require('../assets/room/you.jpg'),Library:require('../assets/room/library.jpg'),
};
export const homeIdle=require('../assets/room/home-idle.mp4');
// The Plus ball styles' local-AI renders: glass is the ball's disc as rendered, clean the same disc without its glints
// (the interior a spin turns), preview the ball on its stand for the picker.
export const ballArt:Record<Exclude<BallStyle,'classic'>,{glass:number;clean:number;preview:number}>={
 smoke:{glass:require('../assets/styles/smoke-glass.jpg'),clean:require('../assets/styles/smoke-clean.jpg'),preview:require('../assets/styles/smoke-preview.jpg')},
 aurora:{glass:require('../assets/styles/aurora-glass.jpg'),clean:require('../assets/styles/aurora-clean.jpg'),preview:require('../assets/styles/aurora-preview.jpg')},
 obsidian:{glass:require('../assets/styles/obsidian-glass.jpg'),clean:require('../assets/styles/obsidian-clean.jpg'),preview:require('../assets/styles/obsidian-preview.jpg')},
 gold:{glass:require('../assets/styles/gold-glass.jpg'),clean:require('../assets/styles/gold-clean.jpg'),preview:require('../assets/styles/gold-preview.jpg')},
};
