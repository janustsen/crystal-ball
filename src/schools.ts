import type {School} from './social';

export function searchSchools(schools:School[],query:string):School[]{
 const term=query.trim().toLocaleLowerCase();
 return term?schools.filter(s=>`${s.name} ${s.city}`.toLocaleLowerCase().includes(term)):schools;
}
export function nearbySchools(schools:School[],latitude:number,longitude:number):School[]{
 // Only a rounded, transient position is used; nothing leaves this function.
 const lat=Math.round(latitude*10)/10,lon=Math.round(longitude*10)/10;
 const distance=(school:School)=>Math.hypot((school.latitude-lat)*111,(school.longitude-lon)*111*Math.cos(lat*Math.PI/180));
 return schools.filter(s=>distance(s)<50).sort((a,b)=>distance(a)-distance(b));
}
