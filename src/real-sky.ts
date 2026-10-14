import {Origin,Horoscope} from 'circular-natal-horoscope-js/dist/index';

// The days that bring a special reading.
export const skyEvents={'full-moon':'Full Moon','new-moon':'New Moon','mercury-retrograde':'Mercury retrograde'} as const;
export type SkyEvent=keyof typeof skyEvents;
// angle: the Moon's distance east of the Sun in degrees (0 new, 180 full); it sets the phase and the drawn moon.
export type Sky={day:string;angle:number;moonSign:string;mercuryRetrograde:boolean;event:SkyEvent|null};

function bodies(ms:number){
 const at=new Date(ms);
 // Latitude and longitude 0 keep the origin in UTC; the Moon's and planets' ecliptic positions do not depend on place.
 const {moon,sun,mercury}=new Horoscope({origin:new Origin({year:at.getUTCFullYear(),month:at.getUTCMonth(),date:at.getUTCDate(),hour:at.getUTCHours(),minute:at.getUTCMinutes(),latitude:0,longitude:0}),houseSystem:'whole-sign',zodiac:'tropical',aspectPoints:[],aspectWithPoints:[],aspectTypes:[]}).CelestialBodies;
 return {angle:(moon.ChartPosition.Ecliptic.DecimalDegrees-sun.ChartPosition.Ecliptic.DecimalDegrees+360)%360,moonSign:String(moon.Sign.label).toLowerCase(),retrograde:Boolean(mercury.isRetrograde)};
}

let last:Sky|undefined;
// One sky per calendar day, read as a UTC day: the Moon and Mercury at noon; an event is a crossing during the day.
// ponytail: the UTC day can sit up to half a day off the viewer's own night; take a time zone if that ever matters.
export function skyOn(day:string):Sky{
 if(last?.day===day)return last;
 const start=Date.parse(`${day}T00:00:00Z`),dawn=bodies(start),noon=bodies(start+432e5),dusk=bodies(start+864e5);
 // The Moon always gains on the Sun, so the angle only falls when it wraps past 360 at the new moon.
 const event=dawn.angle<180&&dusk.angle>=180?'full-moon':dawn.angle>dusk.angle?'new-moon':!dawn.retrograde&&dusk.retrograde?'mercury-retrograde':null;
 return last={day,angle:noon.angle,moonSign:noon.moonSign,mercuryRetrograde:noon.retrograde,event};
}

// "waxing Moon in Sagittarius", with Mercury when it is retrograde.
export function skyLine(sky:Sky){
 const phase=sky.event==='full-moon'?'full':sky.event==='new-moon'?'new':sky.angle<180?'waxing':'waning';
 return `${phase} Moon in ${sky.moonSign[0].toUpperCase()}${sky.moonSign.slice(1)}${sky.mercuryRetrograde?', Mercury retrograde':''}`;
}

// The Moon as it looks tonight: a faint whole disc with the lit part on top, lit from the right while waxing.
export function moonSvg(angle:number,color:string){
 const waning=angle>180,a=(waning?360-angle:angle)*Math.PI/180,rx=Math.abs(Math.cos(a)).toFixed(3);
 const lit=`M0,-1A1,1 0 0 1 0,1A${rx},1 0 0 ${a>Math.PI/2?1:0} 0,-1Z`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.05 -1.05 2.1 2.1"><circle r="1" fill="${color}" opacity=".2"/><path d="${lit}" fill="${color}"${waning?' transform="scale(-1,1)"':''}/></svg>`;
}
