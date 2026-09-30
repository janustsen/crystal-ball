import {phraseSafety} from './safety-policy';
import {topicFor} from './questions';

// Synthetic inspiration only. Real stars use an AI-rewritten, approved wording.
export const skyPrompts = {
 love: {label:'Love',question:'Will I find a deeper connection this year?',x:22,y:24},
 work: {label:'Work',question:'Will a new opportunity find me at work?',x:68,y:18},
 moving: {label:'Moving',question:'Will I feel at home somewhere new?',x:48,y:43},
 learning: {label:'Learning',question:'What new skill will open a door for me?',x:18,y:66},
 growth: {label:'Growth',question:'What personal goal will I grow into this year?',x:75,y:62},
 money: {label:'Money',question:'Will I reach my next savings milestone?',x:46,y:84},
} as const;
export type SkyPrompt = keyof typeof skyPrompts;
export type SkyStar = {id:string;theme:SkyPrompt;wording:string;resonances:number;resonated:boolean;mine:boolean;synthetic:boolean};
export const sampleStars:SkyStar[]=Object.entries(skyPrompts).map(([theme,prompt])=>({id:`sample-${theme}`,theme:theme as SkyPrompt,wording:prompt.question,resonances:0,resonated:false,mine:false,synthetic:true}));
export const sunSigns=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'] as const;
export type SocialProfile={sunSign:string|null;ageBand:'teen'|'adult'|null;plus:boolean};
export function accountSocialProfile(account:{plus:boolean;sunSign?:string|null;ageBand?:'teen'|'adult'|null}):SocialProfile {
 return {sunSign:account.sunSign??null,ageBand:account.ageBand??null,plus:account.plus};
}
export function activityTheme(question:string):SkyPrompt {
 const topic=topicFor(question);
 if(topic==='relocation')return 'moving';
 if(topic==='learning'||topic==='money')return topic;
 if(/\b(love|crush|romance|relationship|dating|connection)\b/i.test(question))return 'love';
 if(/\b(work|career|job|promotion)\b/i.test(question))return 'work';
 return 'growth';
}
export function isSkyPrompt(value:unknown):value is SkyPrompt {
 return typeof value==='string'&&Object.hasOwn(skyPrompts,value);
}
export function safeSealedHeadline(value:unknown):value is string {
 if(typeof value!=='string'||!value.trim()||value.length>160||phraseSafety(value))return false;
 // Basic moderation for incoming private cards too; contact details never render.
 return !/(https?:|www\.|@|\+?\d[\d\s().-]{7,}\d|\b(?:fuck\w*|shit\w*|bitch\w*|nigg\w*|fagg\w*|rape\w*)\b)/i.test(value.normalize('NFKC'));
}
export const socialUnavailable='The shared sky is offline. Sample stars are still here.';
