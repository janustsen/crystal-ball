import {useEffect,useRef} from 'react';
import {Image} from 'react-native';
import {motionCss} from './motionCss';
const css=`
.apothecary{position:absolute;inset:0;overflow:hidden;pointer-events:none;background:#160e09;isolation:isolate}
.room-layer{position:absolute;inset:-4%;transform:translate(calc(var(--px,0)*-5px),calc(var(--py,0)*-3px)) scale(1.04);transition:transform 850ms cubic-bezier(.2,.7,.2,1),opacity 600ms;transform-origin:50% 50%}
.room-layer>div{width:100%;height:100%}.room-defocus{opacity:0}.apothecary.focused .room-layer{transform:translate(calc(var(--px,0)*-9px),2%) scale(1.3)}.apothecary.focused .room-defocus{opacity:1}
.room-shelves,.room-hearth{opacity:0}.apothecary[data-place=history] .room-shelves,.apothecary[data-place=circles] .room-hearth{opacity:1}
.room-doorframe{position:absolute;inset:-4%;opacity:.75;transform:translate(calc(var(--px,0)*13px),calc(var(--py,0)*5px)) scale(1.05);transition:transform 850ms ease,opacity 650ms}.room-doorframe>div{width:100%;height:100%}.focused .room-doorframe{transform:scale(1.55);opacity:0}.utility .room-doorframe{opacity:.25}
.apothecary[data-place=history] .room-layer{transform:translate(9%,3%) scale(1.2)}.apothecary[data-place=circles] .room-layer{transform:translate(-8%,2%) scale(1.17)}.apothecary[data-place=plans] .room-layer{transform:translate(-2%,-4%) scale(1.23)}
.room-shade{position:absolute;inset:0;background:linear-gradient(#120904b3,#120904a6 35%,#120904c9);transition:background 500ms}.apothecary.focused .room-shade{background:#140b09a8}.apothecary.utility .room-shade{background:#130b07cf}
.room-candlelight{position:absolute;inset:0;background:radial-gradient(ellipse at 5% 70%,#d9953326,transparent 55%);animation:candle-breathe 7s ease-in-out infinite}
.room-prop{position:absolute;bottom:8%;width:110px;height:170px;filter:drop-shadow(0 12px 8px #050300aa);transition:transform 850ms ease,opacity 700ms}.room-prop.left{left:-57px;transform:translate(calc(var(--px,0)*8px),calc(var(--py,0)*3px)) rotate(-8deg)}.room-prop.right{right:-65px;bottom:14%;transform:translate(calc(var(--px,0)*12px),calc(var(--py,0)*6px)) rotate(6deg);opacity:.75}.room-prop>div{width:100%;height:100%}.focused .room-prop.left{transform:translateX(-100px)}.focused .room-prop.right{transform:translateX(100px)}.utility .room-prop{opacity:.25}
.room-dust{position:absolute;inset:0;overflow:hidden}.room-dust i{position:absolute;left:var(--x);bottom:8%;width:2px;height:2px;background:#ffdfa7;border-radius:50%;opacity:0;animation:room-dust 19s linear var(--delay) infinite}
@keyframes room-dust{10%,70%{opacity:.25}100%{transform:translate(18px,-650px);opacity:0}}@keyframes candle-breathe{50%{opacity:.65}}
[data-testid=app-shell] [role=heading][tabindex="-1"]{outline:none}
[data-material=parchment],[data-material=wood]{clip-path:polygon(1% 3%,25% 0,52% 1%,78% 0,99% 2%,100% 31%,99% 67%,100% 98%,75% 100%,49% 99%,26% 100%,0 98%,1% 66%,0 30%)}
[data-material=parchment]:focus-visible,[data-testid=app-shell] [data-material=parchment][role]:focus-visible{outline:2px solid #70401b!important;outline-offset:-7px!important}
[data-testid=app-shell] [data-material=wood]{isolation:isolate}[data-testid=app-shell] [data-material=wood]>div:first-child{z-index:-1}[data-testid=app-shell] [data-material=wood][role]:focus-visible{outline-offset:-7px!important}[data-testid=app-shell] [data-material=parchment]{isolation:isolate;filter:drop-shadow(0 5px 5px #09040060)}
[data-testid=app-shell] [data-material=parchment]>div:first-child{z-index:-1}
[data-testid=app-shell] [data-testid=room-table]{transform:perspective(550px) rotateX(18deg);transform-origin:50% 100%;box-shadow:0 12px 0 #29190f,0 20px 22px #0009}
[data-testid=app-shell] [role=tablist]{background-image:linear-gradient(#22150980,#100907e0),url('/concepts/witch-assets/wood-table.jpg');border:0!important;box-shadow:0 -5px 20px #080400aa}
[data-testid=app-shell] [role=button]:focus-visible,[data-testid=app-shell] [role=radio]:focus-visible,[data-testid=app-shell] [role=tab]:focus-visible,[data-testid=app-shell] [role=switch]:focus-visible,[data-testid=app-shell] input:focus-visible,[data-testid=app-shell] textarea:focus-visible{outline:2px solid #f7cb83!important;outline-offset:3px}
[data-testid=app-shell] [data-material=parchment] :focus-visible{outline-color:#70401b!important}
[data-reduced="true"] *,[data-reduced="true"] *::before,[data-reduced="true"] *::after{animation:none!important;transition:none!important}
.apothecary.reduced *{animation:none!important;transition:none!important;transform:none!important}.apothecary.reduced .room-dust{display:none}
@media(prefers-reduced-motion:reduce){[data-testid="app-shell"] *,[data-testid="app-shell"] *::before,[data-testid="app-shell"] *::after{animation:none!important;transition:none!important}.apothecary *{animation:none!important;transition:none!important;transform:none!important}.room-dust{display:none}}
`;
export function Atmosphere({reduce,mood,destination='home',focused=false}:{reduce:boolean;mood:string;destination?:string;focused?:boolean}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const shell=ref.current?.closest('[data-testid=app-shell]');shell?.setAttribute('data-reduced',String(reduce));return()=>shell?.removeAttribute('data-reduced')},[reduce]);
 useEffect(()=>{
  const root=ref.current,shell=root?.parentElement;if(!root||!shell)return;
  let frame=0;const still=()=>reduce||matchMedia('(prefers-reduced-motion:reduce)').matches;
  function move(event:PointerEvent){if(still()||frame)return;const r=shell!.getBoundingClientRect();frame=requestAnimationFrame(()=>{frame=0;root!.style.setProperty('--px',String((event.clientX-r.left)/r.width*2-1));root!.style.setProperty('--py',String((event.clientY-r.top)/r.height*2-1))})}
  function scroll(event:Event){if(still()||frame)return;const el=event.target as HTMLElement;frame=requestAnimationFrame(()=>{frame=0;root!.style.setProperty('--py',String(Math.min(2,el.scrollTop/250)))})}
  shell.addEventListener('pointermove',move,{passive:true});shell.addEventListener('scroll',scroll,true);
  return()=>{cancelAnimationFrame(frame);shell.removeEventListener('pointermove',move);shell.removeEventListener('scroll',scroll,true)};
 },[reduce]);
 return <div ref={ref} aria-hidden="true" data-place={destination} className={`apothecary${reduce?' reduced':''}${focused?' focused':''}${mood==='utility'?' utility':''}`}>
  <style>{motionCss+css}</style>
  <div className="room-layer"><Image source={require('../assets/apothecary/room.webp')} resizeMode="cover" style={{width:'100%',height:'100%'}}/></div>
  <div className="room-layer room-shelves"><Image source={require('../assets/apothecary/shelves.webp')} resizeMode="cover" style={{width:'100%',height:'100%'}}/></div>
  <div className="room-layer room-hearth"><Image source={require('../assets/apothecary/hearth.webp')} resizeMode="cover" style={{width:'100%',height:'100%'}}/></div>
  <div className="room-layer room-defocus"><Image source={require('../assets/apothecary/room-blurred.webp')} resizeMode="cover" style={{width:'100%',height:'100%'}}/></div>
  <div className="room-shade"/><div className="room-candlelight"/>
  <div className="room-doorframe"><Image source={require('../assets/apothecary/doorframe.webp')} resizeMode="cover" style={{width:'100%',height:'100%'}}/></div>
  <div className="room-prop left"><Image source={require('../assets/apothecary/jar.webp')} resizeMode="contain" style={{width:'100%',height:'100%'}}/></div><div className="room-prop right"><Image source={require('../assets/apothecary/jar.webp')} resizeMode="contain" style={{width:'100%',height:'100%'}}/></div>
  <div className="room-dust">{Array.from({length:7},(_,i)=><i key={i} style={{'--x':`${9+i*14}%`,'--delay':`${-i*3}s`} as React.CSSProperties}/>)}</div>
 </div>;
}
