import {entrances,shake,type MotionKind} from './motion';
import {useEffect,useRef,type CSSProperties,type PropsWithChildren} from 'react';
// `fill` marks the screen-level container, which also gets the transition's veil (smoke, ring or flash).
export function Enter({children,reduce=false,variant=0,zoom=false,kind="screen",fill=false,delay=0}:PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind;fill?:boolean;delay?:number}>){
 // An entrance plays once, at mount: once reduced motion has held it still, lifting the preference must not replay it.
 const spec=entrances[zoom?"approach":kind],still=useRef(reduce);if(reduce)still.current=true;
 return <div className={`motion-enter ${spec.name}${fill?' screen-veil':''}`} style={{flexGrow:fill?1:undefined,animationName:still.current?'none':undefined,animationDelay:`${delay}ms`,animationDuration:`${spec.duration}ms`,'--enter-y':`${variant%3===1?-spec.y:spec.y}px`,'--enter-scale':spec.scale,'--enter-rotate':`${'rotate' in spec?spec.rotate:0}deg`,'--flip':`${variant%2?62:-62}deg`} as CSSProperties}>{children}</div>;
}
// Shakes its children once each time `trigger` changes after mount; children stay mounted, so a field keeps focus.
export function Shake({trigger,reduce=false,children}:PropsWithChildren<{trigger:number;reduce?:boolean}>){
 const ref=useRef<HTMLDivElement>(null),consumed=useRef(trigger);
 useEffect(()=>{const changed=trigger!==consumed.current;consumed.current=trigger;if(reduce||!changed)return;const animation=ref.current?.animate(shake.x.map(x=>({transform:`translate3d(${x}px,0,0)`})),{duration:shake.duration});return()=>animation?.cancel()},[trigger,reduce]);
 return <div ref={ref} style={{display:'flex',flexDirection:'column',minWidth:0}}>{children}</div>;
}
