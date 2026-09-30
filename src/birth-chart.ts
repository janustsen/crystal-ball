import {Origin,Horoscope} from 'circular-natal-horoscope-js/dist/index';
import {validBirthday} from './profile';
export function birthChart(birthday:string,time:string,latitude:number,longitude:number){
 if(!validBirthday(birthday)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)throw new Error('Check your birthday, birth time and place.');
 const [year,month,date]=birthday.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
 const chart=new Horoscope({origin:new Origin({year,month:month-1,date,hour,minute,latitude,longitude}),houseSystem:'whole-sign',zodiac:'tropical',aspectPoints:[],aspectWithPoints:[],aspectTypes:[]});
 return {moonSign:String(chart.CelestialBodies.moon.Sign.label).toLowerCase(),risingSign:String(chart.Ascendant.Sign.label).toLowerCase()};
}
export type BirthPlace={name:string;latitude:number;longitude:number};
// Prototype-only city lookup. Birthday and birth time never leave the device.
export async function findBirthPlaces(name:string,signal:AbortSignal):Promise<BirthPlace[]>{
 const response=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`,{signal});
 if(!response.ok)throw new Error('City search is unavailable. Try again later.');
 const data=await response.json();
 return Array.isArray(data.results)?data.results.filter((p:any)=>typeof p.name==='string'&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180).map((p:any)=>({name:[p.name,p.admin1,p.country].filter(v=>typeof v==='string').join(', '),latitude:p.latitude,longitude:p.longitude})):[];
}
