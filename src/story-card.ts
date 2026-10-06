import type {Prediction} from './types';
import {suggestedCheckIn} from './retention';
import {activityTheme,skyPrompts} from './social-policy';

// What a 9:16 story image says. ShareCard draws it on the current look; a designed card replaces the drawing, not this content.
export type StoryCard={kind:'forecast'|'receipt'|'golden-set';golden:boolean;headlines:string[];labels:string[];footer:string;file:string};

const day=(value:string)=>new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00`:value).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});

export function forecastCard(p:Prediction):StoryCard{
 return {kind:'forecast',golden:!!p.golden,headlines:[p.headline],labels:['Speculative forecast','Not a guarantee'],footer:`Check back ${suggestedCheckIn(p)}`,file:'crystal-ball-forecast.png'};
}

// Only a personal "Yes" check-in earns a receipt. It records the asker's own answer, never an accuracy score.
export function receiptCard(p:Prediction|undefined):StoryCard|null{
 if(p?.outcome!=='yes'||p.circleId)return null;
 return {kind:'receipt',golden:!!p.golden,headlines:[p.headline],labels:[`${skyPrompts[activityTheme(p.question)].label} · Speculative forecast · Not a guarantee`,`Sealed ${day(p.createdAt)}${p.checkedInAt?` · opened ${day(p.checkedInAt)}`:''} · Yes`],footer:'Your side of the story',file:'crystal-ball-receipt.png'};
}

export const goldenShelf=(history:Prediction[])=>history.filter(p=>p.golden);

export function goldenSetCard(history:Prediction[]):StoryCard|null{
 const shelf=goldenShelf(history),shown=shelf.slice(0,3);
 if(!shelf.length)return null;
 return {kind:'golden-set',golden:true,headlines:shown.map(p=>p.headline),labels:[`${shelf.length} golden forecast${shelf.length===1?'':'s'}`],footer:shelf.length>shown.length?`+${shelf.length-shown.length} more on the golden shelf`:'From the golden shelf',file:'crystal-ball-golden-set.png'};
}
