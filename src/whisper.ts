import {checkInDate,localDay} from './retention';
import type {Whisper} from './types';

const kept=60,checkable=7;

export function addDays(day:string,amount:number):string{const date=checkInDate(day)!;date.setDate(date.getDate()+amount);return localDay(date)}

// Idempotent per day: the first whisper shown for a day is the one checked.
export function keepWhisper(whispers:Whisper[]=[],day:string,text:string):Whisper[]{
 if(!checkInDate(day)||whispers.some(w=>w.day===day))return whispers;
 return [{day,text},...whispers].sort((a,b)=>b.day.localeCompare(a.day)).slice(0,kept);
}
// The latest whisper from before today, within a week; only it is ever asked about, so skipped days never pile up.
export function lastWhisper(whispers:Whisper[]=[],today=localDay()):Whisper|undefined{
 const earliest=addDays(today,-checkable);
 return whispers.filter(w=>w.day<today&&w.day>=earliest).sort((a,b)=>b.day.localeCompare(a.day))[0];
}
export function answerWhisper(whispers:Whisper[]=[],day:string,outcome:NonNullable<Whisper['outcome']>,today=localDay()):Whisper[]{
 return whispers.map(w=>w.day===day?{...w,outcome,checkedInAt:today}:w);
}
export function whisperQuestion(whisper:Whisper,today=localDay()):string{
 if(whisper.day===addDays(today,-1))return 'Did yesterday’s whisper land?';
 return `Did ${checkInDate(whisper.day)!.toLocaleDateString('en-US',{weekday:'long'})}’s whisper land?`;
}
