// One motion vocabulary for web compositor animations and native-driver animations.
// ease: smoke and glass settling. spring: brass and card arrivals that overshoot once, like a cartoon object landing.
export const motion={ease:[.2,.75,.2,1] as const,spring:[.34,1.56,.64,1] as const,press:180,tap:420,glow:7300};
// Each kind is a named transition in docs/design/motion-language.md; web keyframes live in motionCss.
export const entrances={
 screen:{duration:200,y:6,scale:1,name:'mist-arrive'},
 approach:{duration:400,y:0,scale:1,name:'mist-arrive'},
 listening:{duration:220,y:6,scale:1,name:'mist-arrive'},
 typing:{duration:200,y:6,scale:1,name:'mist-arrive'},
 question:{duration:260,y:8,scale:1,name:'mist-arrive'},
 thinking:{duration:300,y:6,scale:1,name:'mist-arrive'},
 reveal:{duration:550,y:10,scale:1,name:'mist-arrive'},
 share:{duration:220,y:6,scale:1,name:'mist-arrive'},
} as const;
export type MotionKind=keyof typeof entrances;
