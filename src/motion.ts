// One motion vocabulary for web compositor animations and native-driver animations.
export const motion={ease:[.2,.75,.2,1] as const,press:180,glow:7300};
export const entrances={
 screen:{duration:500,y:12,scale:.985},
 approach:{duration:1000,y:0,scale:.8},
 listening:{duration:700,y:10,scale:.98},
 typing:{duration:520,y:16,scale:1},
 question:{duration:850,y:28,scale:.96},
 thinking:{duration:900,y:6,scale:.94},
 reveal:{duration:950,y:18,scale:.98},
 share:{duration:650,y:24,scale:.97},
} as const;
export type MotionKind=keyof typeof entrances;
