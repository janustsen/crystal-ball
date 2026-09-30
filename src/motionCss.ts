// Compositor-only UI motion. Procedural fog is rendered separately by WebGL.
export const motionCss = `
.motion-enter{display:flex;flex-direction:column;min-width:0;animation:screen-arrive 650ms cubic-bezier(.2,.75,.2,1) both}
.motion-zoom{animation-duration:1000ms}
@keyframes screen-arrive{from{opacity:0;transform:translate3d(0,var(--enter-y,-20px),0) scale(var(--enter-scale,.97))}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}
[data-testid="hero-orb"],[role="tab"]{transition:transform 180ms cubic-bezier(.2,.75,.2,1),opacity 180ms ease-out}
[data-testid="hero-orb"]:active,[role="tab"]:active{transform:scale(.96);opacity:.9}
.orb .fb{animation:none}
.orb .halo{inset:-28%;background:radial-gradient(circle at 50% 52%,rgba(244,186,104,.28),rgba(224,164,88,.08) 45%,transparent 68%);animation:orb-glow 7.3s ease-in-out infinite}
.orb .pool{animation:orb-glow 9.7s ease-in-out infinite}
@keyframes orb-glow{0%,100%{opacity:.58;transform:scale(.96)}50%{opacity:1;transform:scale(1.06)}}
.sky{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.shooting-star{position:absolute;left:-100px;top:10%;width:78px;height:1px;background:linear-gradient(90deg,transparent,#e9c48b);box-shadow:0 0 5px #e0a45866;opacity:0;animation:sky-streak 43s cubic-bezier(.3,.1,.65,1) infinite;animation-delay:-8s}
@keyframes sky-streak{0%,88%{opacity:0;transform:translate3d(0,0,0) rotate(20deg)}89%{opacity:.45}94%{opacity:.2}96%,100%{opacity:0;transform:translate3d(560px,175px,0) rotate(20deg)}}
.wandering-moon{position:absolute;left:18%;top:6%;font-size:27px;color:#ddb580;opacity:0;animation:sky-moon 79s ease-in-out infinite;animation-delay:-23s}
@keyframes sky-moon{0%,50%{opacity:0;transform:translate3d(-15px,12px,0)}62%,70%{opacity:.2}86%,100%{opacity:0;transform:translate3d(65px,-22px,0)}}
.hidden-constellation{position:absolute;right:7%;top:21%;color:#e9cd9c;font-size:17px;letter-spacing:7px;opacity:0;animation:sky-stars 61s ease-in-out infinite;animation-delay:-20s}
@keyframes sky-stars{0%,70%,100%{opacity:0}78%,88%{opacity:.22}}
[data-reduced="true"] .sky,.reduced .sky{display:none}
@media(prefers-reduced-motion:reduce){.motion-enter{animation:none}.sky{display:none}}
`;
