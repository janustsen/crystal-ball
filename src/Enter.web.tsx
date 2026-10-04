import {entrances,type MotionKind} from './motion';
import type {CSSProperties,PropsWithChildren} from 'react';
// `fill` marks the screen-level container, which also gets the transition's veil (smoke, ring or flash).
export function Enter({children,reduce=false,variant=0,zoom=false,kind="screen",fill=false,delay=0}:PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind;fill?:boolean;delay?:number}>){
 const spec=entrances[zoom?"approach":kind];
 return <div className={`motion-enter ${spec.name}${fill?' screen-veil':''}`} style={{flexGrow:fill?1:undefined,animationName:reduce?'none':undefined,animationDelay:`${delay}ms`,animationDuration:`${spec.duration}ms`,'--enter-y':`${variant%3===1?-spec.y:spec.y}px`,'--enter-scale':spec.scale,'--flip':`${variant%2?62:-62}deg`} as CSSProperties}>{children}</div>;
}
