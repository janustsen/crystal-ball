import {entrances,type MotionKind} from './motion';
import type {CSSProperties,PropsWithChildren} from 'react';
// Screen and content entrances share a short, readable fade and lift.
export function Enter({children,reduce=false,variant=0,zoom=false,kind="screen",fill=false,delay=0}:PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind;fill?:boolean;delay?:number}>){
 const spec=entrances[zoom?"approach":kind];
 return <div className={`motion-enter ${spec.name}`} style={{flexGrow:fill?1:undefined,animation:reduce?'none':undefined,animationDelay:`${delay}ms`,animationDuration:`${spec.duration}ms`,'--enter-y':`${variant%3===1?-spec.y:spec.y}px`,'--enter-scale':spec.scale} as CSSProperties}>{children}</div>;
}
