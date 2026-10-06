import type {AccountState} from './types.ts';
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
export type BirthChart={moonSign:string;risingSign:string};
const titled=(sign:string)=>sign[0].toUpperCase()+sign.slice(1);
export function astrologyLine(birthday?:string,chart?:BirthChart):string {
 const sign=sunSign(birthday);
 if(!sign)return 'The stars offer a playful lens on your next chapter.';
 return `Under your ${titled(sign)} Sun${chart?`, ${titled(chart.moonSign)} Moon and ${titled(chart.risingSign)} rising`:''}, consider this a playful invitation to your next chapter.`;
}

export function birthdayProfile(birthday?:string,ageConfirmed=false){
 const group=ageGroup(birthday);
 if(group==='under13')throw new Error('Crystal Ball is for ages 13 and up.');
 if(birthday&&!validBirthday(birthday))throw new Error('Use a valid birthday: YYYY-MM-DD.');
 return {birthday,ageConfirmed:group==='unknown'?ageConfirmed:true,sunSign:sunSign(birthday)||null,ageBand:group==='unknown'?(ageConfirmed?'teen' as const:null):group,birthTime:undefined,birthPlace:undefined,moonSign:undefined,risingSign:undefined,chartWeather:undefined};
}

export function updateBirthday(state:AccountState,birthday?:string):AccountState {
 if(birthday&&birthday===state.birthday)return state;
 const confirmed=canRead(state),profile=birthdayProfile(birthday,confirmed);
 const facts={...state.facts};delete facts.birthday;delete facts.sun_sign;
 const history=state.history.map(reading=>{const facts={...reading.facts};delete facts.birthday;return {...reading,facts};});
 return {...state,...profile,...(!birthday&&confirmed?{ageBand:state.ageBand}:{}),facts,history};
}

export const validPersonName=(name:string)=>/^[\p{L}][\p{L}’'\-]{0,39}$/u.test(name);


export function readingAge(birthday?:string,confirmed=false){
 if(birthday!==undefined&&!validBirthday(birthday))throw new Error('Please check your birthday.');
 const group=ageGroup(birthday);
 if(group==='under13')throw new Error('Crystal Ball is for ages 13 and up.');
 if(group==='unknown'&&confirmed!==true)throw new Error('Please confirm you’re 13 or older.');
 return group==='unknown'?'teen':group;
}
export function canRead(state:Pick<AccountState,'birthday'|'ageConfirmed'|'onboardingDone'|'onboardingBlocked'>):boolean {
 if(!state.onboardingDone||state.onboardingBlocked)return false;
 try{readingAge(state.birthday,state.ageConfirmed);return true;}catch{return false;}
}
export function restoreProfile(state:AccountState):AccountState {
 const candidate=state.birthday||state.facts.birthday;
 const birthday=typeof candidate==='string'&&validBirthday(candidate)?candidate:undefined;
 const facts={...state.facts};delete facts.birthday;
 if(state.onboardingBlocked||ageGroup(birthday)==='under13')return {...state,...birthdayProfile(),facts,onboardingBlocked:true,onboardingDone:false};
 const profile=birthdayProfile(birthday,state.ageConfirmed===true);
 return {...state,...profile,...(!birthday&&profile.ageConfirmed&&state.ageBand==='adult'?{ageBand:'adult' as const}:{}),...(birthday?{birthTime:state.birthTime,birthPlace:state.birthPlace,moonSign:state.moonSign,risingSign:state.risingSign,chartWeather:state.chartWeather}:{}),facts,onboardingDone:profile.ageConfirmed&&(state.onboardingDone??Boolean(state.history.length||Object.keys(facts).length))};
}
export function personQuestionIssue(question:string,name?:string):string|undefined {
 if(name===undefined)return;
 if(!validPersonName(name))return 'Use a first name only.';
 const subjectText=name.toLowerCase()==='will'?question.replace(/^\s*will\s+/i,''):question;
 // Keep Unicode case pairs, but not multi-letter expansions or Turkish dotless i.
 const fold=(text:string)=>Array.from(text,c=>(c==='ı'||Array.from(c.toUpperCase()).length>1?c:c.toUpperCase()).toLowerCase());
 const subject=fold(subjectText),letters=fold(name);
 const matches=subject.some((_,i)=>!/\p{L}/u.test(subject[i-1]||'')&&letters.every((letter,j)=>letter===subject[i+j])&&!/\p{L}/u.test(subject[i+letters.length]||''));
 if(!matches)return `Include ${name} in your question, or change the first name to match.`;
}
