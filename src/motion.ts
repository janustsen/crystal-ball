// One motion vocabulary for web compositor animations and native-driver animations.
// ease: smoke and glass settling. spring: brass and card arrivals that overshoot once, like a cartoon object landing.
// glide: the camera's push into the room, easing in and out like the room's own flights.
export const motion={ease:[.2,.75,.2,1] as const,spring:[.34,1.56,.64,1] as const,glide:[.4,0,.2,1] as const,press:180,tap:420,pick:360,glow:7300,push:1000};
// Each kind is a named transition in docs/design/motion-language.md; web keyframes live in motionCss.
export const entrances={
 // Screens slide in from the side of the destination: `direction` -1 enters from the left, 1 from the right.
 screen:{duration:700,x:22,y:0,scale:.985,name:'smoke-wipe'},
 approach:{duration:1000,y:0,scale:.6,name:'orb-portal'},
 listening:{duration:760,y:10,scale:.94,name:'ripple-in'},
 typing:{duration:560,y:18,scale:1,name:'ink-settle'},
 question:{duration:780,y:28,scale:.92,name:'card-flip'},
 thinking:{duration:900,y:6,scale:1.12,name:'inhale'},
 reveal:{duration:1000,y:18,scale:.55,name:'glimpse-burst'},
 share:{duration:720,y:80,scale:1,name:'card-deal'},
 // Micro entrances: replayed by keying Enter on the value that changed.
 count:{duration:460,y:10,scale:.9,name:'count-pop'},
 status:{duration:480,y:8,scale:1,name:'status-swap'},
 toast:{duration:520,y:16,scale:.96,name:'toast-rise'},
 check:{duration:560,y:0,scale:.5,rotate:-45,name:'check-pop'},
} as const;
// A refused action (an empty answer) shakes its field once.
export const shake={duration:420,x:[0,-8,7,-5,3,-1,0]} as const;
export type MotionKind=keyof typeof entrances;
