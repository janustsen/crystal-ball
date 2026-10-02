import {useCallback,useEffect,useRef,useState} from 'react';
export type OpeningProps=React.PropsWithChildren<{active:boolean;reduce:boolean;golden:boolean;onComplete:()=>void}>;
export function useOpening({active,reduce,golden,onComplete}:OpeningProps){
 const [phase,setPhase]=useState<'opening'|'payoff'|'settled'>(active?(reduce?'payoff':'opening'):'settled');
 const completed=useRef(!active),callback=useRef(onComplete);callback.current=onComplete;
 const finish=useCallback(()=>{if(completed.current)return;completed.current=true;setPhase('settled');callback.current()},[]);
 useEffect(()=>{
  if(!active||completed.current)return;
  if(reduce)setPhase('payoff');
  const release=setTimeout(()=>{if(!completed.current)setPhase('payoff')},reduce?0:golden?1350:1100);
  const settle=setTimeout(finish,reduce?180:golden?2050:1800);
  return()=>{clearTimeout(release);clearTimeout(settle)};
 },[active,reduce,golden,finish]);
 return {phase,finish};
}
