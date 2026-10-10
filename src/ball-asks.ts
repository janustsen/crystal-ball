import type {AccountState,Asks,Facts,InsightKind} from './types.ts';
import {activityTheme} from './social-policy.ts';
import {askBonuses} from './billing.ts';

// "The Ball asks": a hand-written deck of one-tap questions about yourself. Answers are remembered facts under
// `self_<id>`; the engine only accepts a value that is one of its question's own options, so no free text reaches a prompt.
// Excluded by design: health, body, sexuality, religion, politics, family conflict, self-harm and other people's feelings.
export type AskArea='love'|'work'|'energy'|'money'|'change'|'taste'|'stars';
export type Ask={id:string;area:AskArea;question:string;options:string[];only?:'adult'|'teen'};
export const areaLabels:Record<AskArea,string>={love:'Love & friends',work:'Work & school',energy:'Energy & routine',money:'Money & ambition',change:'Change & risk',taste:'Taste & style',stars:'The stars'};
const q=(area:AskArea,id:string,question:string,options:string[],only?:'adult'|'teen'):Ask=>({id,area,question,options,...only?{only}:{}});
const bank:Ask[]=[
 q('love','friday_plan','A free Friday night: big group or one close friend?',['Big group','One close friend','Quiet night alone']),
 q('love','make_friends','How do you usually make new friends?',['Through shared activities','Someone introduces us','I start the conversation']),
 q('love','reply_speed','When a friend texts, you reply…',['Right away','Within a few hours','When I have the energy']),
 q('love','plans_cancel','When plans get cancelled, you feel…',['Relief','Disappointment','A bit of both']),
 q('love','friend_role','In your friend group, you’re usually the…',['Planner','Listener','Joker','Wildcard']),
 q('love','show_care','You show you care mostly by…',['Spending time','Helping out','Kind words','Small gifts']),
 q('love','disagree','After a disagreement with a friend, you…',['Talk it out soon','Need space first','Let it fade']),
 q('love','birthday_style','Your ideal birthday is…',['A big party','Dinner with a few people','Something quiet']),
 q('love','old_new_friends','Old friends or new friends?',['Old friends','New friends','Both, always']),
 q('love','open_up','Opening up to people comes…',['Easily','Slowly','Only with a few']),
 q('love','group_chat','In a group chat, you’re…',['Always posting','Mostly reacting','Quietly reading']),
 q('love','friends_come','Friends come to you for…',['Advice','Fun','Calm','Honesty']),
 q('love','alone_time','How much alone time do you need?',['A lot','Some','Very little']),
 q('love','host_guest','Host or guest?',['Host','Guest']),
 q('love','new_people','Meeting new people feels…',['Exciting','Fine','Draining']),
 q('love','keep_touch','Keeping in touch with people is…',['Easy for me','Something I work at','My weak spot']),
 q('love','surprise_plan','Planning a surprise for someone sounds…',['Fun','Stressful','Fun and stressful']),
 q('love','date_idea','Your idea of a good date is…',['Something adventurous','Dinner and talking','A cozy night in'],'adult'),
 q('love','romance_pace','In romance, you tend to move…',['Fast','Slowly','It depends'],'adult'),
 q('love','lunch_table','At lunch, you’d rather…',['Sit with a big group','Sit with one or two friends','Have time to myself'],'teen'),
 q('love','join_club','Joining a new club or team sounds…',['Exciting','Nerve-wracking','Not for me'],'teen'),
 q('work','decide_fast','I decide fast.',['Rarely','Sometimes','Always']),
 q('work','deadline_style','With a deadline, you…',['Start early','Work steadily','Sprint at the end']),
 q('work','team_solo','You do your best work…',['On a team','On my own','It depends on the task']),
 q('work','big_task','Facing a big task, you first…',['Make a plan','Just start','Ask for help']),
 q('work','motivation','What motivates you more?',['Recognition','Progress I can see','Learning something new','The deadline']),
 q('work','group_project','In a group project, you…',['Take the lead','Keep things organized','Bring the ideas','Do my part quietly']),
 q('work','sharp_hours','Your sharpest hours are…',['Early morning','Midday','Evening','Late night']),
 q('work','feedback','Honest feedback feels…',['Useful','Hard but useful','Hard']),
 q('work','after_mistake','After a mistake, you…',['Fix it and move on','Replay it a while','Laugh it off']),
 q('work','learn_by','You learn new things best by…',['Doing','Reading','Watching','Talking it through']),
 q('work','workspace','Your workspace is…',['Spotless','Organized chaos','Chaos']),
 q('work','multitask','One thing at a time or many at once?',['One at a time','Many at once']),
 q('work','ask_help','Asking for help is…',['Easy','Something I put off','Rare for me']),
 q('work','dream_skill','Which skill would you most like to master?',['Speaking with confidence','Making things','Understanding people','Staying organized']),
 q('work','think_aloud','Brainstorm out loud or think first?',['Out loud','Think first']),
 q('work','curiosity','When something interests you, you…',['Go deep','Skim many things','Save it for later']),
 q('work','repetition','Repetitive tasks feel…',['Calming','Fine','Boring fast']),
 q('work','under_pressure','Under pressure, you…',['Sharpen up','Slow down','Freeze for a moment']),
 q('work','work_wants','Right now your work life wants…',['Stability','Growth','A change'],'adult'),
 q('work','side_project','A project of your own on the side sounds…',['Exciting','Too much right now','Already doing one']),
 q('work','fav_class','Your favorite kind of class is…',['Creative','Science or maths','Languages or writing','Sports or movement'],'teen'),
 q('work','homework_time','Homework happens…',['Right after school','After a break','Late in the evening','Just before it’s due'],'teen'),
 q('energy','sunrise_3am','Sunrise or 3 a.m.?',['Sunrise','3 a.m.']),
 q('energy','recharge','You recharge best by…',['Being with people','Being alone','Being outside','Making something']),
 q('energy','sunday','Your ideal Sunday is…',['Out and busy','Slow at home','A bit of both']),
 q('energy','routines','Routines feel…',['Grounding','Useful sometimes','Boring']),
 q('energy','first_thing','The first thing you do after waking up?',['Check my phone','Get moving','Lie there a while']),
 q('energy','energy_sound','When you need energy, you put on…',['Loud music','A podcast','Silence']),
 q('energy','long_walk','A long walk sounds…',['Perfect','Nice sometimes','Not for me']),
 q('energy','busy_mind','When your mind is busy, you…',['Tidy something','Scroll','Move around']),
 q('energy','season','Your season?',['Spring','Summer','Autumn','Winter']),
 q('energy','weather','Best weather for your mood?',['Bright sun','Rain on the window','Crisp and cold','Warm evenings']),
 q('energy','day_plan','Your days are…',['Planned to the hour','Loosely planned','Made up as I go']),
 q('energy','naps','Naps are…',['Essential','Occasional','Impossible for me']),
 q('energy','phone','Your phone is…',['Always in hand','Nearby but quiet','Often forgotten']),
 q('energy','in_out','Indoors or outdoors?',['Indoors','Outdoors']),
 q('energy','pace','Your natural pace is…',['Fast','Steady','Unhurried']),
 q('energy','new_habit','Starting a new habit, you…',['Go all in','Start small','Start and stop a few times']),
 q('energy','late_night','Late nights are for…',['Deep talks','Creative work','Shows and games','Sleep']),
 q('energy','drink','Coffee, tea, or neither?',['Coffee','Tea','Neither']),
 q('energy','morning_kind','Your ideal morning is…',['Quiet and slow','Busy and early','Different every day']),
 q('energy','focus_sound','To focus, you need…',['Silence','Music','Background noise']),
 q('money','spend_save','Spender or saver?',['Spender','Saver','Depends on the week']),
 q('money','treat','Your favorite kind of treat is…',['An experience','Something to keep','Good food']),
 q('money','goal_size','Your goals are…',['Big and bold','Small and steady','Still forming']),
 q('money','success','Success, to you, looks like…',['Freedom','Recognition','Security','Making a difference']),
 q('money','compare','Do you measure your progress against others?',['Often','Sometimes','Rarely']),
 q('money','extra_money','With unexpected extra money, you’d…',['Save it','Invest it','Spend it on something fun'],'adult'),
 q('money','budgets','Budgets are…',['My thing','A good idea I skip','Not for me'],'adult'),
 q('money','money_talk','Talking about money feels…',['Easy','Awkward','Private'],'adult'),
 q('money','win_together','Winning means more when…',['I do it alone','We do it together']),
 q('money','right_now','Right now you’re more…',['Building something','Enjoying where I am','Looking for the next thing']),
 q('money','five_years','Picture yourself in five years. You feel…',['Excited','Curious','Unsure']),
 q('money','good_things','Good things come mostly from…',['Effort','Luck','People you know','A mix']),
 q('money','goal_track','You keep track of your goals…',['Written down','In my head','I don’t really']),
 q('money','impulse','Impulse buys happen…',['Often','Sometimes','Rarely']),
 q('money','gifts','Giving gifts or getting them?',['Giving','Getting']),
 q('money','known_for','Would you like to be known for something?',['Yes, a lot','A little','No thanks']),
 q('money','dream_job','Your dream job would involve…',['Creating things','Helping people','Building or fixing','Performing'],'teen'),
 q('money','save_for','If you saved up, it would be for…',['A trip','Something for a hobby','Something for later'],'teen'),
 q('money','finish_journey','You’re more motivated by…',['The finish line','The journey']),
 q('money','ambition_word','Pick a word for your ambition.',['Quiet','Fierce','Patient','Restless']),
 q('change','new_city','Moving somewhere new sounds…',['Thrilling','Scary but good','Not for me']),
 q('change','menu','At a restaurant, you…',['Order something new','Order my favorite','Ask what’s popular']),
 q('change','big_changes','Big changes feel…',['Exciting','Scary','Both at once']),
 q('change','rules','Rules are…',['Helpful','Meant to be questioned','It depends on the rule']),
 q('change','plan_b','You keep a plan B…',['Always','Sometimes','Never']),
 q('change','leap_look','Leap first or look first?',['Leap','Look']),
 q('change','regret','Which bothers you more?',['Things I did','Things I didn’t do']),
 q('change','travel','Travel: plan everything or wing it?',['Plan everything','Plan a little','Wing it']),
 q('change','comfort_zone','How often do you step out of your comfort zone?',['Often','Now and then','Rarely']),
 q('change','unknown_next','Not knowing what’s next feels…',['Exciting','Uncomfortable','Normal']),
 q('change','change_mind','You change your mind…',['Easily','With good reason','Almost never']),
 q('change','hobbies','You pick up new hobbies…',['All the time','Once in a while','I stick with my favorites']),
 q('change','surprises','Surprises are…',['The best','Fine','Not for me']),
 q('change','risk_word','Pick one: safe, bold or curious?',['Safe','Bold','Curious']),
 q('change','fresh_start','A fresh start is something you…',['Love','Need sometimes','Rarely want']),
 q('change','big_decision','Big decisions: gut or list?',['Gut feeling','Pros and cons list','Ask people I trust']),
 q('change','adventure','Your kind of adventure is…',['Physical','Creative','Social','Travel']),
 q('change','new_look','A completely new look sounds…',['Fun','Maybe someday','No thanks']),
 q('change','waiting','Waiting for an answer, you…',['Stay patient','Check constantly','Distract myself']),
 q('change','lucky','Do you feel lucky?',['Usually','Sometimes','Not really']),
 q('taste','colors','Your colors are…',['Bright','Dark','Neutral','Pastel']),
 q('taste','story_form','Story time: book, film, game or series?',['Book','Film','Game','Series']),
 q('taste','genre','Your favorite kind of story?',['Mystery','Fantasy','Comedy','Adventure']),
 q('taste','city_fields','City lights or open fields?',['City lights','Open fields']),
 q('taste','sea_mountains','Sea or mountains?',['Sea','Mountains']),
 q('taste','style','Your style is…',['Cozy','Bold','Classic','Always changing']),
 q('taste','music','Your music taste is…',['Whatever is new','Old favorites','A bit of everything']),
 q('taste','kitchen','In a kitchen, you…',['Follow the recipe','Improvise','Order food']),
 q('taste','make','You’d rather make…',['Music','Pictures','Words','Things with my hands']),
 q('taste','collect','Do you collect anything?',['Yes, proudly','A little','No']),
 q('taste','sweet_salty','Sweet or salty?',['Sweet','Salty']),
 q('taste','vintage_new','Vintage or brand new?',['Vintage','Brand new']),
 q('taste','time_of_day','Your favorite time of day?',['Morning','Afternoon','Golden hour','Midnight']),
 q('taste','new_city_day','A free afternoon in a new city: museum, market or park?',['Museum','Market','Park']),
 q('taste','camera_roll','Your camera roll is mostly…',['People','Places','Screenshots','Food']),
 q('taste','room_vibe','Your room’s vibe?',['Minimal','Cozy clutter','Colorful','Always changing']),
 q('taste','pets','Cats or dogs?',['Cats','Dogs','Both','Neither']),
 q('taste','fiction_facts','Fiction or facts?',['Fiction','Facts']),
 q('taste','story_role','In a story, you’d be…',['The hero','The sidekick','The mentor','The trickster']),
 q('taste','element','Pick an element.',['Fire','Water','Earth','Air']),
 q('stars','sign_fit','Does your Sun sign fit you?',['Yes','Sometimes','Not at all']),
 q('stars','horoscope','You read your horoscope…',['Daily','Now and then','Only for fun']),
 q('stars','full_moon','Do you feel different at a full moon?',['Yes','Maybe','Not really']),
 q('stars','ask_sign','Do you ask people their sign?',['Always','Sometimes','Never']),
 q('stars','coincidence','Signs and coincidences feel…',['Meaningful','Fun','Just chance']),
 q('stars','stargazing','Stargazing sounds…',['Magical','Nice','Cold']),
 q('stars','tarot','Tarot cards are…',['Fascinating','Fun at parties','Not my thing']),
 q('stars','retrograde','Ever blamed Mercury retrograde?',['Yes, often','Once or twice','Never']),
 q('stars','intuition','You trust your intuition…',['Almost always','Sometimes','Rarely']),
 q('stars','wishes','Do you make wishes on stars or birthday candles?',['Always','Sometimes','Never']),
];
// Deal the deck round-robin across life areas so consecutive cards vary.
const byArea=Object.keys(areaLabels).map(area=>bank.filter(ask=>ask.area===area));
export const asks:Ask[]=Array.from({length:Math.max(...byArea.map(list=>list.length))},(_,i)=>byArea.flatMap(list=>list[i]?[list[i]]:[])).flat();
const byId=new Map(asks.map(ask=>[ask.id,ask]));

export const selfPrefix='self_';
export const selfKey=(id:string)=>`${selfPrefix}${id}`;
export const isSelfKey=(key:string)=>key.startsWith(selfPrefix);
export const askFor=(key:string)=>isSelfKey(key)?byId.get(key.slice(selfPrefix.length)):undefined;
export const isAskId=(id:unknown):id is string=>typeof id==='string'&&byId.has(id);
// Teen-safe unless the account is a confirmed adult, matching the engine's teen-safe default.
export const deckFor=(teen:boolean)=>asks.filter(ask=>ask.only!==(teen?'adult':'teen'));
export const maxAskBonuses=askBonuses(Math.max(deckFor(true).length,deckFor(false).length));

// A self fact is usable only when its key names a bank question and its value is one of that question's options.
export function validSelf(key:string,value:unknown,teen=false):value is string {
 const ask=askFor(key);
 return !!ask&&typeof value==='string'&&ask.options.includes(value)&&!(teen&&ask.only==='adult');
}
export const withoutSelf=(facts:Facts):Facts=>Object.fromEntries(Object.entries(facts).filter(([key])=>!isSelfKey(key)));
export const selfAnswers=(facts:Facts,teen=false)=>Object.entries(facts).filter(([key,value])=>validSelf(key,value,teen)).map(([key,answer])=>({key,question:askFor(key)!.question,answer}));
// The words the forecaster sees and the app quotes: the question with its chosen answer.
export const selfText=(key:string,answer:string)=>`${askFor(key)?.question} ${answer}`;

const forecastAreas:Record<ReturnType<typeof activityTheme>,AskArea[]>={love:['love','change'],work:['work','money'],moving:['change','energy'],learning:['work','energy'],money:['money','change'],growth:['energy','change','work']};
export const selfContextLimit=6;
// The few answers relevant to this question's theme, most recent first. Client and server pick with the same rule.
export function selfContext(question:string,facts:Facts,teen=false):Facts {
 const areas=forecastAreas[activityTheme(question)];
 return Object.fromEntries(selfAnswers(facts,teen).reverse().filter(({key})=>areas.includes(askFor(key)!.area)).slice(0,selfContextLimit).map(({key,answer})=>[key,answer]));
}

export const insightEvery=10;
export const insightKinds=['portrait','enjoy','try','shift'] as const satisfies readonly InsightKind[];
export const noAsks:Asks={seen:[],skipped:[],insights:[],bonus:0};
export const asksOf=(state:Pick<AccountState,'asks'>):Asks=>state.asks??noAsks;
export const insightDue=(asks:Asks)=>Math.floor(asks.seen.length/insightEvery)>asks.insights.length;
export const nextInsightKind=(asks:Asks)=>insightKinds[asks.insights.length%insightKinds.length];
export const bonusDue=(asks:Asks)=>Math.max(0,askBonuses(asks.seen.length)-asks.bonus);

// Progress counts distinct questions ever answered, so changing or forgetting an answer never earns twice.
export function answerAsk(state:AccountState,id:string,answer:string):AccountState {
 const ask=byId.get(id),current=asksOf(state);
 if(!ask||!ask.options.includes(answer))return state;
 return {...state,facts:{...state.facts,[selfKey(id)]:answer},asks:{...current,seen:current.seen.includes(id)?current.seen:[...current.seen,id],skipped:current.skipped.filter(s=>s!==id)}};
}
export function skipAsk(state:AccountState,id:string):AccountState {
 const current=asksOf(state);
 return {...state,asks:{...current,skipped:[...current.skipped.filter(s=>s!==id),id]}};
}
// Unanswered questions first; skipped ones come back once the rest are answered. Undefined when every question has an answer.
export function nextAsk(state:Pick<AccountState,'facts'|'asks'>,teen:boolean):Ask|undefined {
 const open=deckFor(teen).filter(ask=>!(selfKey(ask.id) in state.facts)),skipped=new Set(asksOf(state).skipped);
 return open.find(ask=>!skipped.has(ask.id))??asksOf(state).skipped.map(id=>open.find(ask=>ask.id===id)).find(Boolean);
}
// The Ball's instant acknowledgement after each answer, in rotation.
const reflections=['Noted. The Ball sees you a little more clearly.','A small piece of your sky, filled in.','The Ball will remember that.','That tells the Ball something real.','Another star in your chart.','The mist thins a little.','Your answer is safe with the Ball.','Interesting. Very you.'];
export const reflection=(count:number)=>reflections[count%reflections.length];
