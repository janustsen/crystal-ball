import type {AccountState} from './types';
import {titled} from './profile';

// Sun, Moon and rising as three small lit glass balls with one line each. Signs come from the birth chart on this device;
// the lines are fixed copy, so the card never needs the network or a model.
export type LightKey='sun'|'moon'|'rising';
export type Light={key:LightKey;name:string;sign?:string;line?:string;color:string};

const lights:{key:LightKey;name:string;color:string}[]=[
 {key:'sun',name:'Sun',color:'227,199,143'},
 {key:'moon',name:'Moon',color:'214,220,230'},
 {key:'rising',name:'Rising',color:'232,160,78'},
];
// Sun: what you shine at. Moon: what makes you feel at home. Rising: how you arrive.
const lines:Record<string,Record<LightKey,string>>={
 aries:{sun:'You shine when you go first.',moon:'You feel at home when you can act fast.',rising:'You arrive bold and ready.'},
 taurus:{sun:'You shine by building what lasts.',moon:'You feel at home in comfort and calm.',rising:'You arrive calm and grounded.'},
 gemini:{sun:'You shine through quick, bright talk.',moon:'You feel at home when your mind is busy.',rising:'You arrive curious and quick.'},
 cancer:{sun:'You shine by keeping your people close.',moon:'You feel at home among your own people.',rising:'You arrive gentle and caring.'},
 leo:{sun:'You shine when your heart is seen.',moon:'You feel at home when you are celebrated.',rising:'You arrive warm and hard to miss.'},
 virgo:{sun:'You shine in the details you perfect.',moon:'You feel at home when things are in order.',rising:'You arrive thoughtful and precise.'},
 libra:{sun:'You shine by bringing things into balance.',moon:'You feel at home in peace and fair play.',rising:'You arrive graceful and at ease.'},
 scorpio:{sun:'You shine when you go all the way in.',moon:'You feel at home with deep, true trust.',rising:'You arrive quiet and magnetic.'},
 sagittarius:{sun:'You shine chasing the far horizon.',moon:'You feel at home with room to roam.',rising:'You arrive open and full of plans.'},
 capricorn:{sun:'You shine climbing toward something real.',moon:'You feel at home with a steady plan.',rising:'You arrive composed and capable.'},
 aquarius:{sun:'You shine by thinking a new way.',moon:'You feel at home with space to be you.',rising:'You arrive a little unexpected.'},
 pisces:{sun:'You shine through feeling and imagining.',moon:'You feel at home in quiet daydreams.',rising:'You arrive soft and dreamy.'},
};

export function threeLights(state:Pick<AccountState,'sunSign'|'moonSign'|'risingSign'>):Light[]{
 const signs={sun:state.sunSign??undefined,moon:state.moonSign,rising:state.risingSign};
 return lights.map(light=>{const sign=signs[light.key],line=sign?lines[sign]?.[light.key]:undefined;return line?{...light,sign:titled(sign!),line}:light});
}

// One glass ball, lit from within by rgb; unlit balls stay dark glass. Rendered by SvgXml in the app and drawn into the web export.
export function lightBall(rgb?:string){
 // Inline SVGs share one document on web, so gradient ids carry the light to keep each ball's own colour.
 const id=rgb?rgb.replace(/\D+/g,'-'):'off';
 const core=rgb?`<radialGradient id="c${id}" cx="50%" cy="58%" r="55%"><stop offset="0" stop-color="rgb(${rgb})"/><stop offset=".55" stop-color="rgb(${rgb})" stop-opacity=".55"/><stop offset="1" stop-color="#140E0A" stop-opacity=".9"/></radialGradient><radialGradient id="h${id}" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="rgb(${rgb})" stop-opacity=".35"/><stop offset="1" stop-color="rgb(${rgb})" stop-opacity="0"/></radialGradient>`
  :`<radialGradient id="c${id}" cx="50%" cy="58%" r="55%"><stop offset="0" stop-color="#3A2D22"/><stop offset="1" stop-color="#160F0A"/></radialGradient>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs>${core}<radialGradient id="s${id}" cx="50%" cy="50%" r="50%"><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset=".97" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#FFF2DE" stop-opacity=".25"/></radialGradient></defs>${rgb?`<circle cx="100" cy="100" r="99" fill="url(#h${id})"/>`:''}<circle cx="100" cy="100" r="70" fill="url(#c${id})"/><circle cx="100" cy="100" r="70" fill="url(#s${id})"/><ellipse cx="78" cy="72" rx="20" ry="11" transform="rotate(-30 78 72)" fill="#FFF4E4" opacity="${rgb?.45:.18}"/><circle cx="100" cy="100" r="69.5" fill="none" stroke="#FFF2DE" stroke-opacity=".22"/></svg>`;
}
