import {checkInDate,localDay} from './retention';
import type {Whisper} from './types';

const kept=60;

export function addDays(day:string,amount:number):string{const date=checkInDate(day)!;date.setDate(date.getDate()+amount);return localDay(date)}

// Idempotent per day: the first whisper shown for a day is the one checked.
export function keepWhisper(whispers:Whisper[]=[],day:string,text:string):Whisper[]{
 if(!checkInDate(day)||whispers.some(w=>w.day===day))return whispers;
 return [{day,text},...whispers].sort((a,b)=>b.day.localeCompare(a.day)).slice(0,kept);
}
export function lastWhisper(whispers:Whisper[]=[],today=localDay()):Whisper|undefined{
 return whispers.find(w=>w.day===addDays(today,-1));
}
export function answerWhisper(whispers:Whisper[]=[],day:string,outcome:NonNullable<Whisper['outcome']>,today=localDay()):Whisper[]{
 return whispers.map(w=>w.day===day?{...w,outcome,checkedInAt:today}:w);
}
