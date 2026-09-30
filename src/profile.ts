export function validBirthday(value:string):boolean {
 return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value&&value<='9999-12-31'&&value>='1900-01-01'&&value<=new Date().toISOString().slice(0,10);
}
export function ageGroup(birthday?:string,today=new Date().toISOString().slice(0,10)):'unknown'|'under13'|'teen'|'adult' {
 if(!birthday||!validBirthday(birthday))return 'unknown';
 const age=Number(today.slice(0,4))-Number(birthday.slice(0,4))-(today.slice(5)<birthday.slice(5)?1:0);
 return age<13?'under13':age<18?'teen':'adult';
}
const signs=[['01-20','Aquarius'],['02-19','Pisces'],['03-21','Aries'],['04-20','Taurus'],['05-21','Gemini'],['06-21','Cancer'],['07-23','Leo'],['08-23','Virgo'],['09-23','Libra'],['10-23','Scorpio'],['11-22','Sagittarius'],['12-22','Capricorn']];
export function sunSign(birthday?:string):string|undefined {
 if(!birthday||!validBirthday(birthday))return;
 return (signs.filter(([start])=>birthday.slice(5)>=start).at(-1)?.[1]||'Capricorn').toLowerCase();
}
export function astrologyLine(birthday?:string):string {
 const sign=sunSign(birthday);
 return sign?`Under your ${sign[0].toUpperCase()+sign.slice(1)} Sun, consider this a playful invitation to your next chapter.`:'The stars offer a playful lens on your next chapter.';
}

export function birthdayProfile(birthday?:string){
 const group=ageGroup(birthday);
 if(group==='under13')throw new Error('Crystal Ball is for ages 13 and up.');
 if(birthday&&!validBirthday(birthday))throw new Error('Use a valid birthday: YYYY-MM-DD.');
 return {birthday,sunSign:sunSign(birthday)||null,ageBand:group==='unknown'?null:group,birthTime:undefined,birthPlace:undefined,moonSign:undefined,risingSign:undefined};
}

export const validPersonName=(name:string)=>/^[\p{L}][\p{L}’'\-]{0,39}$/u.test(name);
