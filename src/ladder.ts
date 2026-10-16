import type {AccountState} from './types.ts';

// The feature ladder: a new account starts with only the ball, and each feature opens after this many questions, fast
// early then spaced. `does` is the one line that says what the feature is for, wherever it appears.
export const ladder=[
 {feature:'history',at:1,name:'History',does:'Every answer the Ball gives you, saved with the day to check if it came true.'},
 {feature:'about',at:3,name:'About you',does:'Quick questions about you, so your readings fit your life.'},
 {feature:'insight',at:5,name:'Daily insight',does:'A short personal insight on Home, new every day.'},
 {feature:'bond',at:8,name:'Bond reading',does:'Ask about you and one person, and where your bond is heading.'},
 {feature:'sky',at:12,name:'Tonight’s Sky',does:'What everyone is asking tonight, shared anonymously, and private Circles with friends.'},
 {feature:'library',at:20,name:'Inner Library',does:'Your year ahead, sealed month by month, and ball and card styles.'},
] as const;
export type Feature=typeof ladder[number]['feature'];
export type Step=typeof ladder[number];
// asked: questions counted for the ladder, kept through Forget everything so a feature never closes again.
// opened: features tapped at least once, which clears their dot.
export type Ladder={asked:number;opened:Feature[]};
type Account=Pick<AccountState,'ladder'|'history'|'plus'|'yearAhead'>;

export const step=(feature:Feature)=>ladder.find(s=>s.feature===feature)!;
export const questionsAsked=(s:Pick<AccountState,'ladder'|'history'>)=>Math.max(s.ladder.asked,s.history.length);
// Paying accounts have every feature.
export const unlocked=(s:Account,feature:Feature)=>s.plus||!!s.yearAhead||questionsAsked(s)>=step(feature).at;
// The dot: a feature the ladder opened that has not been tapped yet.
export const fresh=(s:Pick<AccountState,'ladder'|'history'>,feature:Feature)=>questionsAsked(s)>=step(feature).at&&!s.ladder.opened.includes(feature);
export const openFeature=<S extends Pick<AccountState,'ladder'>>(s:S,feature:Feature):S=>!s.ladder.opened.includes(feature)?{...s,ladder:{...s.ladder,opened:[...s.ladder.opened,feature]}}:s;
// Counts one more question; call it with the state from before the reading joins the history.
export const countQuestion=<S extends Pick<AccountState,'ladder'|'history'>>(s:S):S=>({...s,ladder:{...s.ladder,asked:questionsAsked(s)+1}});
// The feature the next question opens, given how many were asked before it.
export const opensAt=(asked:number)=>ladder.find(s=>s.at===asked+1);
export const upcoming=(s:Pick<AccountState,'ladder'|'history'>)=>ladder.find(l=>l.at>questionsAsked(s));
// The newest feature still showing its dot, among those that live off Home (the insight and Sky show their own dot there).
const newest=(s:Pick<AccountState,'ladder'|'history'>)=>[...ladder].reverse().find(l=>l.feature!=='insight'&&l.feature!=='sky'&&fresh(s,l.feature));

// Home's one next-step card, most useful first: something newly opened elsewhere, a check-in due today, when the next free
// question comes, the last few starter questions, then what the next questions open.
export type HomeStep={kind:'new';step:Step}|{kind:'check-in'}|{kind:'tomorrow'}|{kind:'starter';left:number}|{kind:'next';step:Step;left:number};
export function homeStep(s:Account,{remaining,starter,checkIn}:{remaining:number;starter:number;checkIn:boolean}):HomeStep|null{
 const opened=newest(s);
 if(opened)return {kind:'new',step:opened};
 if(checkIn)return {kind:'check-in'};
 if(!s.plus&&remaining<=0)return {kind:'tomorrow'};
 if(!s.plus&&starter>0&&starter<=3)return {kind:'starter',left:starter};
 const next=upcoming(s);
 return next?{kind:'next',step:next,left:next.at-questionsAsked(s)}:null;
}
