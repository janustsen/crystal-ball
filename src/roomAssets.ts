import type {Spot} from './room';

// Bundled room media (scripts/room-assets.mjs): every spot's still and Home's living loop.
export const roomStills:Record<Spot,number>={
 Home:require('../assets/room/home.jpg'),Sky:require('../assets/room/sky.jpg'),Ask:require('../assets/room/ask.jpg'),
 History:require('../assets/room/history.jpg'),You:require('../assets/room/you.jpg'),
};
export const homeIdle=require('../assets/room/home-idle.mp4');
