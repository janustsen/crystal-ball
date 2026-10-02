// Compositor-first UI motion and the illustrated depth layer. Procedural fog is rendered separately by WebGL.
// Transition names match entrances[kind].name in motion.ts and docs/design/motion-language.md.
const spring='cubic-bezier(.34,1.56,.64,1)',ease='cubic-bezier(.2,.75,.2,1)';
export const motionCss = `
.motion-enter{position:relative;display:flex;flex-direction:column;min-width:0;animation:smoke-wipe 700ms ${ease} both}
.smoke-wipe{animation-name:smoke-wipe;animation-timing-function:${ease}}
.orb-portal{animation-name:orb-portal;animation-timing-function:${ease}}
.ripple-in{animation-name:ripple-in;animation-timing-function:${ease}}
.ink-settle{animation-name:ink-settle;animation-timing-function:${spring}}
.card-flip{animation-name:card-flip;animation-timing-function:${spring};transform-origin:50% 40%}
.inhale{animation-name:inhale;animation-timing-function:${ease}}
.glimpse-burst{animation-name:glimpse-burst;animation-timing-function:${ease};transform-origin:50% 22%}
.card-deal{animation-name:card-deal;animation-timing-function:${spring};transform-origin:50% 100%}
@keyframes smoke-wipe{0%,22%{opacity:0;transform:translate3d(-22px,0,0) skewX(5deg)}100%{opacity:1;transform:none}}
@keyframes orb-portal{0%{opacity:0;transform:scale(var(--enter-scale,.6))}30%{opacity:1}100%{opacity:1;transform:none}}
.orb-portal.screen-veil::before{content:'';position:absolute;z-index:19;left:50%;top:34%;width:1600px;height:1600px;margin:-800px 0 0 -800px;pointer-events:none;background:radial-gradient(circle,rgba(14,9,6,0) 0 20px,rgba(14,9,6,.98) 44px);opacity:0;animation:portal-iris 1000ms cubic-bezier(.5,0,.2,1) both}
@keyframes portal-iris{0%{opacity:1;transform:scale(1)}70%{opacity:1}100%{opacity:0;transform:scale(28)}}
@keyframes ripple-in{0%{opacity:0;transform:scale(var(--enter-scale,.94))}100%{opacity:1;transform:none}}
@keyframes ink-settle{0%{opacity:0;transform:translate3d(0,var(--enter-y,18px),0) skewY(-2.5deg)}55%{opacity:1}100%{opacity:1;transform:none}}
@keyframes card-flip{0%{opacity:0;transform:perspective(1000px) rotateY(var(--flip,-62deg)) translate3d(0,var(--enter-y,28px),-80px) scale(var(--enter-scale,.92))}40%{opacity:1}100%{opacity:1;transform:none}}
@keyframes inhale{0%{opacity:0;transform:scale(var(--enter-scale,1.12)) rotate(-3deg)}100%{opacity:1;transform:none}}
@keyframes glimpse-burst{0%{opacity:0;transform:scale(var(--enter-scale,.55))}45%{opacity:1;transform:scale(1.05,.95)}68%{transform:scale(.97,1.04)}86%{transform:scale(1.01,.99)}100%{opacity:1;transform:none}}
@keyframes card-deal{0%{opacity:0;transform:translate3d(0,var(--enter-y,80px),0) rotate(8deg) scale(var(--enter-scale,.9))}35%{opacity:1}100%{opacity:1;transform:none}}
.screen-veil::after{content:'';position:absolute;pointer-events:none;z-index:20;opacity:0;animation:inherit;animation-delay:0ms}
.smoke-wipe.screen-veil::after{top:-12%;bottom:-12%;left:-60%;width:120%;background:radial-gradient(70px 90px at 86% 14%,rgba(232,212,178,.55),transparent 70%),radial-gradient(80px 110px at 92% 36%,rgba(214,190,152,.6),transparent 70%),radial-gradient(70px 90px at 84% 58%,rgba(232,212,178,.5),transparent 70%),radial-gradient(90px 120px at 91% 80%,rgba(214,190,152,.55),transparent 70%),radial-gradient(70px 80px at 85% 98%,rgba(232,212,178,.5),transparent 70%),linear-gradient(90deg,rgba(14,9,6,0),rgba(14,9,6,.94) 45%,rgba(30,21,13,.96) 76%,rgba(30,21,13,0) 96%);animation-name:veil-sweep;animation-timing-function:cubic-bezier(.45,0,.35,1)}
@keyframes veil-sweep{0%{opacity:1;transform:translate3d(-10%,0,0)}60%{opacity:1}100%{opacity:0;transform:translate3d(150%,0,0) scale(1.15)}}
.orb-portal.screen-veil::after,.glimpse-burst.screen-veil::after,.ripple-in.screen-veil::after{left:50%;top:var(--veil-y,34%);width:160px;height:160px;margin:-80px 0 0 -80px;border-radius:50%;border:3px solid #F2C284;box-shadow:0 0 0 2px #0B0604,0 0 34px rgba(242,170,90,.7),inset 0 0 26px rgba(242,170,90,.5);animation-name:veil-ring;animation-timing-function:cubic-bezier(.1,.6,.3,1)}
.ripple-in.screen-veil::after{--veil-y:24%;border-width:2px}
.glimpse-burst.screen-veil::after{--veil-y:26%;border-width:4px}
@keyframes veil-ring{0%{opacity:1;transform:scale(.2)}100%{opacity:0;transform:scale(4.2)}}
.card-flip.screen-veil::after,.inhale.screen-veil::after,.ink-settle.screen-veil::after,.card-deal.screen-veil::after{left:50%;top:40%;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;background:radial-gradient(circle,rgba(236,214,180,.34),rgba(150,110,70,.16) 38%,rgba(40,28,18,0) 66%);animation-name:veil-puff;animation-timing-function:ease-out}
.inhale.screen-veil::after{animation-name:veil-gather}
@keyframes veil-puff{0%{opacity:1;transform:scale(.4)}100%{opacity:0;transform:scale(1.7)}}
@keyframes veil-gather{0%{opacity:0;transform:scale(1.8)}40%{opacity:.9}100%{opacity:0;transform:scale(.3)}}
.motion-zoom{animation-duration:1000ms}

/* Tap: every tappable squashes and stretches; a burst of brass sparks leaves the touch point. */
.tap-squash{animation:tap-squash 420ms ${ease}!important}
@keyframes tap-squash{0%{transform:scale(1)}20%{transform:scale(1.07,.86)}46%{transform:scale(.95,1.07)}70%{transform:scale(1.02,.98)}100%{transform:scale(1)}}
[data-testid="hero-orb"].tap-squash{animation-name:orb-jelly!important;animation-duration:620ms!important}
@keyframes orb-jelly{0%{transform:scale(1)}18%{transform:scale(1.08,.9)}40%{transform:scale(.94,1.06)}62%{transform:scale(1.03,.97)}82%{transform:scale(.99,1.01)}100%{transform:scale(1)}}
.tap-burst{position:absolute;width:0;height:0;pointer-events:none;z-index:60}
.tap-burst i{position:absolute;left:-6px;top:-6px;width:12px;height:12px;background:#FFE2AE;clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);opacity:0;animation:tap-spark 560ms cubic-bezier(.15,.8,.3,1) forwards}
.tap-burst b{position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;border:2px solid rgba(242,194,132,.9);box-shadow:0 0 12px rgba(242,170,90,.6);animation:tap-ring 480ms ease-out forwards}
@keyframes tap-spark{0%{opacity:1;transform:rotate(var(--a)) translate3d(6px,0,0) scale(.6)}35%{opacity:1;transform:rotate(var(--a)) translate3d(calc(var(--r)*.7),0,0) scale(1)}100%{opacity:0;transform:rotate(var(--a)) translate3d(var(--r),0,0) scale(.2)}}
@keyframes tap-ring{0%{opacity:1;transform:scale(.25)}100%{opacity:0;transform:scale(1.7)}}

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
[role="tab"][aria-selected="true"] svg{transform:translateY(-2px);filter:drop-shadow(0 2px 0 #0B0604) drop-shadow(0 0 8px rgba(224,164,88,.55))}
[role="tab"] svg{transition:transform 260ms ${spring}}

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
