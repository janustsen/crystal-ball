import type {Facts,Plan,ReadingContext} from './types';
import {inferFacts,planFor} from './questions';

// The first card asks about a present fact while the engine prepares its tailored cards.
export function openingPlan(question:string,known:Facts,context:ReadingContext={}):Plan {
 const base=planFor(question,context.personName?{}:known);
 const missing=base.cards.filter(c=>!c.id.startsWith('session_'));
 if(!context.personName&&context.timing!=='love'&&base.topic!=='general'&&missing.length<=2)return {...base,cards:missing.length?missing:base.cards.slice(0,1)};
 const provided=inferFacts(question,'general');
 let prompt='What have you already done about this?',options=['Taken a first step','Been working on it','Nothing yet'];
 if(context.personName)prompt=`What has ${context.personName} already done about this?`;
 else if(context.timing==='love'||/\b(dating|meet someone|find love)\b/i.test(question)){prompt='How often do you meet new people?';options=['Most weeks','Once a month','Rarely'];}
 else if(/\b(paint|painting|project|finish|write|writing|build|creating)\b/i.test(question)){prompt='How far along are you?';options=['Just starting','Partway through','Nearly finished'];}
 else if(/\b(learn|practice|fluent|spanish|language|team|audition)\b/i.test(question)){prompt='How often do you practice?';options=['Most days','Once or twice a week','Not yet'];}
 else if(/\b(promotion|review|promoted)\b/i.test(question)){prompt='How did your last review go?';options=['Very well','Mixed','Not yet'];}
 else if(/\b(travel|trip|holiday|vacation)\b/i.test(question)){prompt='What have you already booked?';options=['Travel and stay','Just travel','Nothing yet'];}
 if(context.timing==='love')delete provided.horizon;
 const cards=[{id:'context_1',question:prompt,options:[...options,'Other'],remember:false}];
 if(!provided.horizon&&context.timing!=='love')cards.push({id:'horizon',question:'How far ahead should the Ball look?',options:['Within 3 months','Within 6 months','Within a year','Other'],remember:false});
 return {topic:'general',provided,cards};
}

// Freeze the card being answered; append the tailored questions only if they arrived before that answer.
export function appendTailored(opening:Plan,tailored:Plan):Plan {
 if(opening.topic!=='general')return opening;
 const first=opening.cards[0],key=(question:string)=>question.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim(),same=(card:Plan['cards'][number])=>key(card.question)===key(first.question);
 // Reuse a repeated card’s fact key so the opening answer satisfies that required input.
 const duplicate=tailored.cards.find(same);
 return {...tailored,cards:[{...first,id:duplicate?.id??'session_open'},...tailored.cards.filter(card=>!same(card))]};
}
