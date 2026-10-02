import {useCallback,useEffect,useRef,useState} from 'react';
export type OpeningProps=React.PropsWithChildren<{active:boolean;reduce:boolean;golden:boolean;onShown:()=>void}>;
export function useOpening({active,reduce,golden,onShown}:OpeningProps){
 // Marking a reading shown changes the parent's entry policy, not this mounted animation.
 const enabled=useRef(active).current;
 const [phase,setPhase]=useState<'opening'|'payoff'|'settled'>(enabled?(reduce?'payoff':'opening'):'settled');
 const completed=useRef(!enabled),shown=useRef(!enabled),callback=useRef(onShown);callback.current=onShown;
 const markShown=useCallback(()=>{if(shown.current)return;shown.current=true;callback.current()},[]);
 const finish=useCallback(()=>{if(completed.current)return;completed.current=true;setPhase('settled');markShown()},[markShown]);
 useEffect(()=>{
  if(!enabled||completed.current)return;
  if(shown.current){finish();return;}
  if(reduce){setPhase('payoff');markShown();}
  const release=setTimeout(()=>{if(!completed.current){setPhase('payoff');markShown()}},reduce?0:golden?1350:1100);
  const settle=setTimeout(finish,reduce?180:golden?2050:1800);
  return()=>{clearTimeout(release);clearTimeout(settle)};
 },[enabled,reduce,golden,finish,markShown]);
 return {phase,finish};
}
