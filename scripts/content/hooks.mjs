// Hook bank for the AI-generated reveal videos (see README.md). Categories only: no real people, no minors, no accuracy claims.
// Questions use horizons the engine can date (this week, this month, in N months, this year).

// Format A: sealed-forecast reveal. `hook` is the on-screen caption; `question` is typed into the real app.
export const forecasts=[
 {category:'situationship',hook:'I asked the ball if my situationship ends this week',question:'Will my situationship end this week?'},
 {category:'job-search',hook:'I asked the ball if I hear back about the job this month',question:'Will I hear back about my job application this month?'},
 {category:'side-hustle',hook:'I asked the ball if my side hustle makes its first sale',question:'Will my side hustle make its first sale this month?'},
 {category:'apartment',hook:'I asked the ball if I find an apartment before my lease ends',question:'Will I find a new apartment within two months?'},
 {category:'gym-streak',hook:'I asked the ball if my gym streak survives the month',question:'Will I keep my gym streak going this month?'},
 {category:'raise',hook:'I asked the ball if asking for a raise works out',question:'Will I get a raise in the next three months?'},
 {category:'group-trip',hook:'I asked the ball if the group chat trip actually happens',question:'Will our group trip get booked this year?'},
 {category:'sourdough',hook:'I asked the ball if my sourdough starter makes it',question:'Will my sourdough starter survive the next two weeks?'},
 {category:'half-marathon',hook:'I asked the ball if I finish my first half marathon',question:'Will I finish a half marathon within six months?'},
 {category:'first-date',hook:'I asked the ball if the dating apps finally deliver',question:'Will I go on a fun first date this month?'},
 {category:'novel',hook:'I asked the ball if I finish my novel draft',question:'Will I finish my novel draft this year?'},
 {category:'language',hook:'I asked the ball if I actually learn Spanish this time',question:'Will I hold a basic conversation in Spanish within six months?'},
 {category:'houseplant',hook:'I asked the ball if my houseplant comes back to life',question:'Will my struggling houseplant recover within a month?'},
 {category:'promotion',hook:'I asked the ball if I get the promotion',question:'Will I get promoted at work this year?'},
 {category:'new-city',hook:'I asked the ball if I make a real friend in my new city',question:'Will I make a close friend in my new city within three months?'},
];

export const receipts=[
 {category:'package',question:'Will my package arrive this week?'},
 {category:'reading',question:'Will I finish the book I am reading this week?'},
 {category:'landlord',question:'Will my landlord fix the heater this week?'},
 {category:'cooking',question:'Will I stick to cooking at home this week?'},
 {category:'pub-quiz',question:'Will my team win the pub quiz next week?'},
 {category:'interview',question:'Will I get a callback for the second interview within two weeks?'},
 {category:'5k',question:'Will I finish a 5k run this month?'},
 {category:'inbox',question:'Will I answer all my unread emails this week?'},
 {category:'bread',question:'Will my sourdough loaf rise properly this week?'},
 {category:'early-riser',question:'Will I wake up before 7 every day this week?'},
 {category:'concert',question:'Will the concert tickets go on sale this month?'},
 {category:'side-project',question:'Will I ship the first version of my side project this month?'},
];

export function receiptExamples(dayIndex,count){
 return Array.from({length:count},(_,i)=>({...receipts[(dayIndex*count+i)%receipts.length],hook:'How a check-in works',label:'AI-generated demo',outcome:['yes','no','pending'][(dayIndex+i)%3]}));
}

// Format C: daily-omen slideshow. Adult birthdays mid-sign; the engine writes each omen live.
export const signs=[
 {sign:'Aries',glyph:'♈',birthday:'1994-04-05'},{sign:'Taurus',glyph:'♉',birthday:'1994-05-05'},{sign:'Gemini',glyph:'♊',birthday:'1994-06-05'},
 {sign:'Cancer',glyph:'♋',birthday:'1994-07-07'},{sign:'Leo',glyph:'♌',birthday:'1994-08-07'},{sign:'Virgo',glyph:'♍',birthday:'1994-09-07'},
 {sign:'Libra',glyph:'♎',birthday:'1994-10-07'},{sign:'Scorpio',glyph:'♏',birthday:'1994-11-07'},{sign:'Sagittarius',glyph:'♐',birthday:'1994-12-07'},
 {sign:'Capricorn',glyph:'♑',birthday:'1994-01-05'},{sign:'Aquarius',glyph:'♒',birthday:'1994-02-05'},{sign:'Pisces',glyph:'♓',birthday:'1994-03-05'},
];

// Adult profile used for A and B readings.
export const profileBirthday='1994-06-15';

const banned=/soulmate|reveals? who|who likes|crush|accura|guarantee|\bproven?\b|psychic|always right|\bteen|school|\bkids?\b|child|minor|classmate|\brat(e|ing)|\breview|\d+ ?%/i;
const proper=new Set(['I','Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Spanish','Friday','Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces','Crystal','Ball','Check','It','Not','Yes','Today','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']);
// Throws when caption text breaks the content rules. Capitalized words mid-sentence must be allowlisted, which keeps real names out.
export function assertSafe(text){
 if(banned.test(text))throw new Error(`Content rule: banned wording in "${text}"`);
 for(const [,word] of text.matchAll(/(?<!^|[.!?]\s+|[“"‘'])\b([A-Z][a-z]+)/g))if(!proper.has(word))throw new Error(`Content rule: possible name "${word}" in "${text}"`);
 return text;
}
