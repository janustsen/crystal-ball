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

let last:{key:string;sky:Sky}|undefined;
export function skyOn(day:string,timeZone='UTC'):Sky{
 const key=`${day}/${timeZone}`;
 if(last?.key===key)return last.sky;
 const calendar=Date.parse(`${day}T00:00:00Z`);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(calendar)||new Date(calendar).toISOString().slice(0,10)!==day)throw new Error('Please provide a valid local calendar date.');
 const format=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const localInstant=(wall:number)=>{
  let instant=wall;
  for(let i=0;i<3;i++){
   const parts=Object.fromEntries(format.formatToParts(instant).map(p=>[p.type,p.value]));
   const shown=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
   instant+=wall-shown;
  }
  return instant;
 };
 const dawn=bodies(localInstant(calendar)),night=bodies(localInstant(calendar+720e5)),dusk=bodies(localInstant(calendar+864e5));
 const event=dawn.angle<180&&dusk.angle>=180?'full-moon':dawn.angle>dusk.angle?'new-moon':!dawn.retrograde&&dusk.retrograde?'mercury-retrograde':null;
 const sky:Sky={day,angle:night.angle,moonSign:night.moonSign,mercuryRetrograde:night.retrograde,event};
 last={key,sky};
 return sky;
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
