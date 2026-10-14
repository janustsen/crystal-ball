import type {Prediction} from './types';
import {suggestedCheckIn} from './retention';
import {activityTheme,skyPrompts} from './social-policy';
import {identity,type WeekRecap,type YearRecap} from './recap';
import {threeLights,type Light} from './three-lights';
import type {AccountState} from './types';

// What a 9:16 story image says. ShareCard draws it on the current look; a designed card replaces the drawing, not this content.
// pair names the other person in a Bond reading, whose card shows two balls.
export type StoryCard={kind:'forecast'|'receipt'|'golden-set'|'three-lights'|'week'|'year';golden:boolean;headlines:string[];labels:string[];footer:string;file:string;lights?:Light[];pair?:string};

const day=(value:string)=>new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00`:value).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});

export function forecastCard(p:Prediction):StoryCard{
 const pair=p.bond&&(p.personName??p.friendTarget?.firstName);
 return {kind:'forecast',golden:!!p.golden,headlines:[p.headline],labels:p.bond?[p.bond.name,`${p.bond.percent}% compatible`]:[],footer:`Check back ${suggestedCheckIn(p)}`,file:p.bond?'crystal-ball-bond.png':'crystal-ball-forecast.png',...(pair?{pair}:{})};
}

// Only a personal "Yes" check-in earns a receipt; Circle, friend and Person readings never do. It records the asker's own answer, never an accuracy score.
export function receiptCard(p:Prediction|undefined):StoryCard|null{
 if(p?.outcome!=='yes'||p.circleId||p.friend||p.personName)return null;
 return {kind:'receipt',golden:!!p.golden,headlines:[p.headline],labels:[skyPrompts[activityTheme(p.question)].label,`Sealed ${day(p.createdAt)}${p.checkedInAt?` · opened ${day(p.checkedInAt)}`:''} · Yes`],footer:'Your side of the story',file:'crystal-ball-receipt.png'};
}

export const goldenShelf=(history:Prediction[])=>history.filter(p=>p.golden);

export function goldenSetCard(history:Prediction[]):StoryCard|null{
 const shelf=goldenShelf(history),shown=shelf.slice(0,3);
 if(!shelf.length)return null;
 return {kind:'golden-set',golden:true,headlines:shown.map(p=>p.headline),labels:[`${shelf.length} golden forecast${shelf.length===1?'':'s'}`],footer:shelf.length>shown.length?`+${shelf.length-shown.length} more on the golden shelf`:'From the golden shelf',file:'crystal-ball-golden-set.png'};
}

// Shareable only once all three lights are lit. Signs and their lines only; never the birthday, birth time or place.
export function threeLightsCard(state:Pick<AccountState,'sunSign'|'moonSign'|'risingSign'>):StoryCard|null{
 const lights=threeLights(state);
 if(lights.some(light=>!light.line))return null;
 return {kind:'three-lights',golden:false,headlines:[],labels:['Your three lights'],footer:'Sun · Moon · Rising',file:'crystal-ball-three-lights.png',lights};
}

const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
const counts=(...parts:(string|false)[])=>parts.filter(Boolean).join(' · ');
const short=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'});

// Recaps share a playful label and counts only: no questions, headlines or accuracy score. Nothing happened, nothing to share.
export function weekCard(recap:WeekRecap):StoryCard|null{
 if(!recap.readings&&!recap.landed)return null;
 return {kind:'week',golden:false,headlines:[identity(recap.theme)],labels:['Your week in the Ball',counts(!!recap.readings&&plural(recap.readings,'reading'),!!recap.golden&&plural(recap.golden,'golden find'),!!recap.landed&&`${plural(recap.landed,'whisper')} landed`),...(recap.theme?[`Most on your mind: ${skyPrompts[recap.theme].label}`]:[])],footer:`${short(recap.from)} – ${short(recap.to)}`,file:'crystal-ball-week.png'};
}

export function yearCard(recap:YearRecap):StoryCard|null{
 if(!recap.readings)return null;
 return {kind:'year',golden:false,headlines:[identity(recap.themes[0].theme)],labels:[`Your ${recap.year} in the Ball`,counts(plural(recap.readings,'reading'),!!recap.golden&&plural(recap.golden,'golden find'),!!recap.yes&&plural(recap.yes,'Yes check-in')),`Most asked: ${skyPrompts[recap.themes[0].theme].label}`],footer:'Year in review',file:`crystal-ball-${recap.year}.png`};
}
