import {Orb,Action} from './ui';
import {Image} from 'react-native';
import {useOpening,type OpeningProps} from './useOpening';
import type {CSSProperties} from 'react';
const css=`
.opening-content{display:flex;flex-direction:column;min-width:0}
.opening-stage{position:relative;min-height:420px;display:flex;flex-direction:column;justify-content:center;align-items:center;isolation:isolate}
.opening-object{position:relative;width:240px;height:270px;animation:orb-charge var(--release) ease-in-out both}
.opening-object .halo,.opening-object .pool,.opening-object .orb::before{display:none}
.opening-object .gb{animation:none!important}
.opening-fracture{position:absolute;left:14px;top:0;width:213px;height:213px;border-radius:50%;overflow:hidden;mix-blend-mode:screen;animation:seam-charge var(--release) ease-in both;pointer-events:none}
.opening-mist{position:absolute;inset:-16px;border-radius:50%;background:radial-gradient(ellipse at 45% 55%,#e0a45855,transparent 65%);animation:mist-release var(--release) ease-out both;pointer-events:none}
.opening-ring{position:absolute;inset:30px 10px 50px;border:2px solid var(--accent);border-radius:50%;animation:opening-ring 450ms ease-out var(--charge) both;pointer-events:none}
.opening-ember{position:absolute;left:50%;top:45%;width:3px;height:6px;border-radius:50%;background:var(--accent);animation:opening-ember 450ms ease-out var(--charge) both;pointer-events:none}
.opening-skip{display:flex;flex-direction:column;width:100%;max-width:260px;margin-top:28px}
.opening-payoff{animation:forecast-settle 700ms cubic-bezier(.2,.75,.2,1) both;transform-origin:50% 25%}
.opening-payoff.calm{animation:forecast-calm 180ms ease-out both}
@keyframes orb-charge{0%{transform:scale(1);opacity:1}12%{transform:scale(1.025,.975)}24%{transform:scale(.99,1.01) rotate(-.6deg)}40%{transform:rotate(.9deg)}54%{transform:rotate(-1.3deg)}66%{transform:rotate(1.8deg)}77%{transform:rotate(-2.5deg) scale(.98,1.02)}82%{transform:rotate(0) scale(1.035,.975);opacity:1}100%{transform:scale(1.07);opacity:0}}
@keyframes seam-charge{0%,25%{opacity:0;transform:scaleY(.2)}80%{opacity:.85;transform:scaleY(1)}100%{opacity:0;transform:scaleY(1.08)}}
@keyframes mist-release{0%,55%{opacity:0;transform:scale(.6)}82%{opacity:.6}100%{opacity:0;transform:scale(1.25)}}
@keyframes opening-ring{0%{opacity:0;transform:scale(.75)}15%{opacity:.55}100%{opacity:0;transform:scale(1.45)}}
@keyframes opening-ember{0%{opacity:0;transform:translate(0,0) scale(.5)}15%{opacity:.7}100%{opacity:0;transform:translate(var(--x),var(--y)) scale(.25)}}
@keyframes forecast-settle{0%{opacity:1;transform:translateY(32px) rotate(4deg) scale(.97)}35%{opacity:1}75%{transform:translateY(-3px) rotate(-.3deg) scale(1)}100%{opacity:1;transform:none}}
@keyframes forecast-calm{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.opening-object,.opening-fracture,.opening-mist,.opening-ring,.opening-ember{animation:none!important}.opening-ring,.opening-ember,.opening-fracture,.opening-mist{display:none}.opening-payoff{animation:forecast-calm 180ms ease-out both}}
`;
export function RevealOpening(props:OpeningProps){
 const {phase,finish}=useOpening(props),{golden,reduce,children}=props;
 return <><style>{css}</style>{phase==='opening'?<div data-testid="reveal-opening" className="opening-stage" style={{'--charge':`${golden?1150:900}ms`,'--release':`${golden?1350:1100}ms`,'--accent':golden?'#F2C284':'#C49B68'} as CSSProperties}>
  <div aria-hidden="true" className="opening-object"><Orb size={240} reduce/><div className="opening-fracture"><Image source={require('../assets/apothecary/smoke.webp')} style={{width:'100%',height:'100%',opacity:.7}}/></div><div className="opening-mist"/><div className="opening-ring"/>{Array.from({length:golden?12:8},(_,i)=>{const angle=i*Math.PI*2/(golden?12:8);return <i key={i} className="opening-ember" style={{'--x':`${Math.cos(angle)*130}px`,'--y':`${Math.sin(angle)*110}px`} as CSSProperties}/>})}</div>
  <div className="opening-skip"><Action testID="skip-reveal" label="Show forecast" quiet onPress={finish}/></div>
 </div>:<div data-testid="reveal-content" className={`opening-content${phase==='payoff'?` opening-payoff${reduce?' calm':''}`:''}`}>{children}</div>}</>;
}
