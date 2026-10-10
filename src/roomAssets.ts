import type {Spot} from './room';
import type {BallStyle} from './types';

// Bundled room media (scripts/room-assets.mjs): every spot's still, every flight (keyed by flightKey) and Home's living loop.
export const roomStills:Record<Spot,number>={
 Home:require('../assets/room/home.jpg'),Sky:require('../assets/room/sky.jpg'),Ask:require('../assets/room/ask.jpg'),
 History:require('../assets/room/history.jpg'),You:require('../assets/room/you.jpg'),Library:require('../assets/room/library.jpg'),
};
export const roomFlights:Record<string,number>={
 'ask-history':require('../assets/room/flights/ask-history.mp4'),'ask-home':require('../assets/room/flights/ask-home.mp4'),'ask-sky':require('../assets/room/flights/ask-sky.mp4'),
 'ask-you':require('../assets/room/flights/ask-you.mp4'),'history-ask':require('../assets/room/flights/history-ask.mp4'),'history-home':require('../assets/room/flights/history-home.mp4'),
 'history-sky':require('../assets/room/flights/history-sky.mp4'),'history-you':require('../assets/room/flights/history-you.mp4'),'home-ask':require('../assets/room/flights/home-ask.mp4'),
 'home-history':require('../assets/room/flights/home-history.mp4'),'home-library':require('../assets/room/flights/home-library.mp4'),'home-sky':require('../assets/room/flights/home-sky.mp4'),
 'home-you':require('../assets/room/flights/home-you.mp4'),'sky-ask':require('../assets/room/flights/sky-ask.mp4'),'sky-history':require('../assets/room/flights/sky-history.mp4'),
 'sky-home':require('../assets/room/flights/sky-home.mp4'),'sky-you':require('../assets/room/flights/sky-you.mp4'),'you-ask':require('../assets/room/flights/you-ask.mp4'),
 'you-history':require('../assets/room/flights/you-history.mp4'),'you-home':require('../assets/room/flights/you-home.mp4'),'you-sky':require('../assets/room/flights/you-sky.mp4'),
};
export const homeIdle=require('../assets/room/home-idle.mp4');
// The room as the glass ball sees it (scripts/bake-ball-env.mjs).
export const ballEnv=require('../assets/room/ball-env.bin');
// The Plus ball styles' local-AI renders: glass is the ball's disc as rendered, clean the same disc without its glints
// (the interior a spin turns), preview the ball on its stand for the picker.
export const ballArt:Record<Exclude<BallStyle,'classic'>,{glass:number;clean:number;preview:number}>={
 smoke:{glass:require('../assets/styles/smoke-glass.jpg'),clean:require('../assets/styles/smoke-clean.jpg'),preview:require('../assets/styles/smoke-preview.jpg')},
 aurora:{glass:require('../assets/styles/aurora-glass.jpg'),clean:require('../assets/styles/aurora-clean.jpg'),preview:require('../assets/styles/aurora-preview.jpg')},
 obsidian:{glass:require('../assets/styles/obsidian-glass.jpg'),clean:require('../assets/styles/obsidian-clean.jpg'),preview:require('../assets/styles/obsidian-preview.jpg')},
 gold:{glass:require('../assets/styles/gold-glass.jpg'),clean:require('../assets/styles/gold-clean.jpg'),preview:require('../assets/styles/gold-preview.jpg')},
};
