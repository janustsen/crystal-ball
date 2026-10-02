// One motion vocabulary for web compositor animations and native-driver animations.
// ease: smoke and glass settling. spring: brass and card arrivals that overshoot once, like a cartoon object landing.
export const motion={ease:[.2,.75,.2,1] as const,spring:[.34,1.56,.64,1] as const,press:180,tap:420,glow:7300};
// Each kind is a named transition in docs/design/motion-language.md; web keyframes live in motionCss.
export const entrances={
 screen:{duration:700,y:12,scale:.985,name:'smoke-wipe'},
 approach:{duration:1000,y:0,scale:.6,name:'orb-portal'},
 listening:{duration:760,y:10,scale:.94,name:'ripple-in'},
 typing:{duration:560,y:18,scale:1,name:'ink-settle'},
 question:{duration:780,y:28,scale:.92,name:'card-flip'},
 thinking:{duration:900,y:6,scale:1.12,name:'inhale'},
 reveal:{duration:1000,y:18,scale:.55,name:'glimpse-burst'},
 share:{duration:720,y:80,scale:1,name:'card-deal'},
} as const;
export type MotionKind=keyof typeof entrances;
