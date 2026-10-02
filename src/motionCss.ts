// Compositor-first UI motion and the illustrated depth layer. Procedural fog is rendered separately by WebGL.
// Transition names match entrances[kind].name in motion.ts and docs/design/motion-language.md.
const spring='cubic-bezier(.34,1.56,.64,1)',ease='cubic-bezier(.2,.75,.2,1)';
export const motionCss = `
.motion-enter{position:relative;display:flex;flex-direction:column;min-width:0;animation:mist-arrive 200ms ${ease} both}
@keyframes mist-arrive{from{opacity:1;transform:translate3d(0,var(--enter-y,6px),0)}to{opacity:1;transform:none}}
.tap-burst{position:absolute;width:0;height:0;pointer-events:none;z-index:60}
.tap-burst b{position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;border:1px solid rgba(242,194,132,.6);animation:tap-ring 320ms ease-out forwards}
@keyframes tap-ring{from{opacity:.6;transform:scale(.7)}to{opacity:0;transform:scale(1.6)}}

/* Illustrated depth: inked silhouette, brass rim, candle bounce light and a cartoon glass highlight. */
.orb::before{content:'';position:absolute;left:14%;right:14%;top:calc(var(--s)*1.04);height:calc(var(--s)*.1);border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.75),rgba(0,0,0,0));pointer-events:none}
.orb .gb{box-shadow:0 0 0 calc(var(--s)*.012 + 1.5px) #0B0604,inset 0 0 0 calc(var(--s)*.008 + 1px) rgba(242,194,132,.45),inset 0 calc(var(--s)*-.07) calc(var(--s)*.09) rgba(255,150,70,.42),inset 0 calc(var(--s)*.06) calc(var(--s)*.08) rgba(0,0,0,.55),0 calc(var(--s)*.05) 0 rgba(0,0,0,.4),0 calc(var(--s)*.1) calc(var(--s)*.18) rgba(0,0,0,.6)}
.orb .gb::after{content:'';position:absolute;z-index:3;left:12%;top:9%;width:42%;height:42%;border-radius:50%;border-top:calc(var(--s)*.035 + 1px) solid rgba(255,248,232,.78);border-left:calc(var(--s)*.012) solid rgba(255,248,232,.25);transform:rotate(-24deg);pointer-events:none}
.orb .gb::before{content:'';position:absolute;z-index:3;left:66%;top:16%;width:calc(var(--s)*.055);height:calc(var(--s)*.055);border-radius:50%;background:rgba(255,250,240,.85);box-shadow:calc(var(--s)*.045) calc(var(--s)*.05) 0 calc(var(--s)*-.012) rgba(255,250,240,.55);pointer-events:none}
.orb .halo{inset:-28%;background:radial-gradient(circle at 50% 52%,rgba(244,186,104,.32),rgba(224,164,88,.1) 45%,transparent 68%);animation:orb-glow 7.3s ease-in-out infinite}
.orb .pool{animation:orb-glow 9.7s ease-in-out infinite}
.orb .fb{animation:none}
.orb .gb{animation:orb-float 6.1s ease-in-out infinite}
.orb:not(.hero) .gb{animation-duration:4.7s}
@keyframes orb-float{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,calc(var(--s)*-.022),0)}}
.orb::before{animation:shadow-breathe 6.1s ease-in-out infinite}
@keyframes shadow-breathe{0%,100%{opacity:1;transform:scaleX(1)}50%{opacity:.7;transform:scaleX(.9)}}
@keyframes orb-glow{0%,100%{opacity:.58;transform:scale(.96)}50%{opacity:1;transform:scale(1.06)}}
[role="tab"][aria-selected="true"] svg{border-bottom:1px solid #E0A458;filter:drop-shadow(0 2px 0 #0B0604) drop-shadow(0 0 8px rgba(224,164,88,.55))}
[role="tab"] svg{transition:transform 260ms ${spring}}
[data-testid^="sky-theme-"]>div:first-child{animation:star-bob 5.3s ease-in-out infinite}
[data-testid^="sky-theme-"]:nth-child(2n)>div:first-child{animation-duration:6.7s;animation-delay:-2.1s}
[data-testid^="sky-theme-"]:nth-child(3n)>div:first-child{animation-duration:5.9s;animation-delay:-3.7s}
@keyframes star-bob{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-4px,0)}}

/* Parallax: far stars, mid sky visitors, near embers. Pointer moves set --px/--py; layers also sway on their own. */
.sky,.embers,.candle{transition:translate 900ms ${ease}}
.sky{position:absolute;inset:0;pointer-events:none;overflow:hidden;translate:calc(var(--px,0)*-7px) calc(var(--py,0)*-5px)}
.embers{translate:calc(var(--px,0)*16px) calc(var(--py,0)*12px)}
.candle{translate:calc(var(--px,0)*4px) 0}
.stars{position:absolute;inset:0;overflow:hidden;animation:sky-sway 23s ease-in-out infinite alternate}
.stars::before,.stars::after{content:'';position:absolute;inset:-260px 0 0 -220px;background-image:radial-gradient(1.4px 1.4px at 20px 30px,#F6DDB0,transparent),radial-gradient(1px 1px at 120px 90px,#E9C48B,transparent),radial-gradient(1.6px 1.6px at 70px 170px,#FFF1D6,transparent),radial-gradient(1px 1px at 180px 210px,#D9B27A,transparent);background-size:220px 260px;opacity:.5;animation:star-drift 140s linear infinite}
.stars::after{background-size:150px 190px;opacity:.28;animation:star-drift-near 90s linear infinite,twinkle 5.9s ease-in-out infinite alternate}
@keyframes star-drift{to{transform:translate3d(220px,260px,0)}}
@keyframes star-drift-near{to{transform:translate3d(150px,190px,0)}}
@keyframes twinkle{from{opacity:.12}to{opacity:.36}}
@keyframes sky-sway{from{transform:translate3d(-4px,2px,0)}to{transform:translate3d(5px,-3px,0)}}
.shooting-star{position:absolute;left:-100px;top:10%;width:78px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,#f3d29b);box-shadow:0 0 6px #e0a45888;opacity:0;animation:sky-streak 43s cubic-bezier(.3,.1,.65,1) infinite;animation-delay:-8s}
@keyframes sky-streak{0%,88%{opacity:0;transform:translate3d(0,0,0) rotate(20deg)}89%{opacity:.55}94%{opacity:.25}96%,100%{opacity:0;transform:translate3d(560px,175px,0) rotate(20deg)}}
.wandering-moon{position:absolute;left:18%;top:6%;font-size:27px;color:#ddb580;text-shadow:0 2px 0 #0B0604;opacity:0;animation:sky-moon 79s ease-in-out infinite;animation-delay:-23s}
@keyframes sky-moon{0%,50%{opacity:0;transform:translate3d(-15px,12px,0)}62%,70%{opacity:.24}86%,100%{opacity:0;transform:translate3d(65px,-22px,0)}}
.hidden-constellation{position:absolute;right:7%;top:21%;color:#e9cd9c;font-size:17px;letter-spacing:7px;opacity:0;animation:sky-stars 61s ease-in-out infinite;animation-delay:-20s}
@keyframes sky-stars{0%,70%,100%{opacity:0}78%,88%{opacity:.24}}
[data-reduced="true"] .sky,.reduced .sky,[data-reduced="true"] .tap-burst{display:none}
@media(prefers-reduced-motion:reduce){.motion-enter{animation:none}.screen-veil::after,.screen-veil::before{display:none}.sky,.tap-burst{display:none}.tap-squash{animation:none!important}}
`;
