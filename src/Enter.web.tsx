import {entrances,motion,type MotionKind} from './motion';
import type {CSSProperties,PropsWithChildren} from 'react';
export function Enter({children,reduce=false,variant=0,zoom=false,kind="screen",fill=false,delay=0}:PropsWithChildren<{reduce?:boolean;variant?:number;zoom?:boolean;kind?:MotionKind;fill?:boolean;delay?:number}>){
 const spec=entrances[zoom?"approach":kind];
 return <div className={`motion-enter${zoom?' motion-zoom':''}`} style={{flexGrow:fill?1:undefined,animation:reduce?'none':undefined,animationDelay:`${delay}ms`,animationDuration:`${spec.duration}ms`,animationTimingFunction:`cubic-bezier(${motion.ease.join(',')})`,'--enter-y':`${variant%3===1?-spec.y:spec.y}px`,'--enter-scale':spec.scale} as CSSProperties}>{children}</div>;
}
