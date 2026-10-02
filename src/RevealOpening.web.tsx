import {Orb,Action} from './ui';
import {useOpening,type OpeningProps} from './useOpening';
import type {CSSProperties} from 'react';
const css=`
.opening-content{display:flex;flex-direction:column;min-width:0}
.opening-stage{position:relative;min-height:420px;display:flex;flex-direction:column;justify-content:center;align-items:center;isolation:isolate}
.opening-object{position:relative;width:240px;height:270px;animation:orb-charge var(--release) ease-in-out both}
.opening-object .halo,.opening-object .pool,.opening-object .orb::before{display:none}
.opening-base{position:absolute;left:0;top:240px;width:240px;height:30px;overflow:hidden}.opening-base>div{margin-top:-240px}
.opening-object .gb,.opening-object .pool,.opening-object .halo,.opening-object .orb::before{animation:none!important}
.opening-half{position:absolute;inset:0;will-change:transform,opacity}
.opening-left{clip-path:inset(0 50% 30px 0);animation:glass-left 250ms cubic-bezier(.2,.75,.2,1) var(--charge) both}
.opening-right{clip-path:inset(0 0 30px 50%);animation:glass-right 250ms cubic-bezier(.2,.75,.2,1) var(--charge) both}
.opening-seam{position:absolute;left:50%;top:15%;height:58%;width:2px;background:linear-gradient(transparent,#f2c284,transparent);box-shadow:0 0 18px 6px #e0a45855;animation:seam-charge var(--release) ease-in both}
.opening-ring{position:absolute;inset:30px 10px 50px;border:2px solid var(--accent);border-radius:50%;animation:opening-ring 450ms ease-out var(--charge) both;pointer-events:none}
.opening-ember{position:absolute;left:50%;top:45%;width:3px;height:6px;border-radius:50%;background:var(--accent);animation:opening-ember 450ms ease-out var(--charge) both;pointer-events:none}
.opening-skip{width:100%;max-width:260px;margin-top:28px}
.opening-payoff{animation:forecast-settle 700ms cubic-bezier(.2,.75,.2,1) both;transform-origin:50% 25%}
.opening-payoff.calm{animation:forecast-calm 180ms ease-out both}
@keyframes orb-charge{0%{transform:scale(1);opacity:1}12%{transform:scale(1.025,.975)}24%{transform:scale(.99,1.01) rotate(-.6deg)}40%{transform:rotate(.9deg)}54%{transform:rotate(-1.3deg)}66%{transform:rotate(1.8deg)}77%{transform:rotate(-2.5deg) scale(.98,1.02)}82%{transform:rotate(0) scale(1.035,.975);opacity:1}100%{transform:scale(1.07);opacity:0}}
@keyframes seam-charge{0%,25%{opacity:0;transform:scaleY(.2)}80%{opacity:.85;transform:scaleY(1)}100%{opacity:0;transform:scaleY(1.08)}}
@keyframes glass-left{from{transform:none}to{transform:translate(-14px,3px) rotate(-5deg)}}
@keyframes glass-right{from{transform:none}to{transform:translate(14px,3px) rotate(5deg)}}
@keyframes opening-ring{0%{opacity:0;transform:scale(.75)}15%{opacity:.55}100%{opacity:0;transform:scale(1.45)}}
@keyframes opening-ember{0%{opacity:0;transform:translate(0,0) scale(.5)}15%{opacity:.7}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(.25)}}
@keyframes forecast-settle{0%{opacity:1;transform:translateY(32px) rotate(4deg) scale(.97)}35%{opacity:1}75%{transform:translateY(-3px) rotate(-.3deg) scale(1)}100%{opacity:1;transform:none}}
@keyframes forecast-calm{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.opening-object,.opening-half,.opening-seam,.opening-ring,.opening-ember{animation:none!important}.opening-ring,.opening-ember,.opening-seam{display:none}.opening-payoff{animation:forecast-calm 180ms ease-out both}}
`;
export function RevealOpening(props:OpeningProps){
 const {phase,finish}=useOpening(props),{golden,reduce,children}=props;
 return <><style>{css}</style>{phase==='opening'?<div data-testid="reveal-opening" className="opening-stage" style={{'--charge':`${golden?1150:900}ms`,'--release':`${golden?1350:1100}ms`,'--accent':golden?'#F2C284':'#C49B68'} as CSSProperties}>
  <div aria-hidden="true" className="opening-object"><div className="opening-half opening-left"><Orb size={240} reduce/></div><div className="opening-half opening-right"><Orb size={240} reduce/></div><div className="opening-base"><div><Orb size={240} reduce/></div></div><div className="opening-seam"/><div className="opening-ring"/>{Array.from({length:golden?12:8},(_,i)=>{const angle=i*Math.PI*2/(golden?12:8);return <i key={i} className="opening-ember" style={{'--x':`${Math.cos(angle)*130}px`,'--y':`${Math.sin(angle)*110}px`} as CSSProperties}/>})}</div>
  <div className="opening-skip"><Action testID="skip-reveal" label="Show forecast" quiet onPress={finish}/></div>
 </div>:<div data-testid="reveal-content" className={`opening-content${phase==='payoff'?` opening-payoff${reduce?' calm':''}`:''}`}>{children}</div>}</>;
}
