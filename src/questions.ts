import type { Card, Facts, Plan, Topic } from './types.ts';
const card=(id:string,question:string,options:string[],remember=true):Card=>({id,question,options:[...options,'Other'],remember});
export const registry: Record<Topic,Card[]> = {
 money:[card('currency','Which currency should the Ball use?',['USD','EUR','GBP']),card('assets','What are your assets worth today?',['0','25000','100000']),card('debt','How much debt do you have?',['0','10000','50000']),card('monthly_saving','How much do you save each month?',['100','500','1500']),card('years','How many years ahead?',['5','10','20'],false),card('return','Which annual growth assumption fits?',['3','5','7']),card('saving_growth','How much will annual savings grow (%)?',['0','2','5']),card('withdrawals','How much will you withdraw each year?',['0','1000','5000']),card('windfall','Any one-off amount to add now?',['0','5000','20000'],false),card('inflation','Should the number account for inflation?',['No, future money','Yes, assume 2%','Yes, assume 3%'],false)],
 learning:[card('level','What is your level now?',['New beginner','Know the basics','Intermediate']),card('practice','How much time can you give it daily?',['10 minutes','20 minutes','45 minutes']),card('conversation','How often can you speak with someone?',['Rarely','Weekly','Daily']),card('deadline','When do you want to use it?',['In 3 months','In 6 months','In a year'],false)],
 relocation:[card('location','Where do you live now?',['Boston','London','Copenhagen']),card('destination','Which city are you considering?',['Chicago','Berlin','Barcelona']),card('work','How flexible is your work?',['Remote','Need a new job','Already have an offer']),card('lease','When can you leave your current home?',['Within 3 months','Within 6 months','More than a year']),card('runway','How many months could your savings cover?',['1 month','3 months','6 months'])],
 growth:[card('current_users','How many people use your project today?',['0','100','1000']),card('weekly_growth','How many net new users join each week?',['2','10','50']),card('growth_weeks','How many weeks ahead?',['4','12','26'],false)],
 sports:[card('competition','Which competition do you mean?',['Men’s World Cup','Women’s World Cup','NBA championship'],false),card('edition','Which edition?',['2027','2030','2034'],false),card('team','Which contenders should the Ball compare?',['Argentina, Spain, France','Brazil, England, Germany','USA, Portugal, Netherlands'],false)],
 world:[card('definition','What counts as success here?',['A clear majority','A narrow lead','A noticeable shift'],false),card('scenario','Which conditions should the forecast assume?',['Current conditions continue','Support increases','Constraints tighten'],false),card('evidence','What current information can you add?',['No additional evidence'],false)],
 general:[card('goal','What result are you hoping for?',['A new beginning','Steady progress','A big breakthrough'],false),card('horizon','How far ahead should we look?',['3 months','6 months','1 year'],false),card('effort','How much effort can you give it?',['A little each week','Most days','Every day']),card('obstacle','What gets in your way most?',['Time','Confidence','Resources'],false)],
};
export function topicFor(question:string):Topic {
 if(/net worth|savings|wealth|money in|worth in/i.test(question))return 'money';
 if(/spanish|learn|fluent|language/i.test(question))return 'learning';
 if(/where.*(?:move|live)|(?:will I|will we|I will|we will).*move (?:to|out|away|abroad|house|cities)|relocat/i.test(question))return 'relocation';
 if(/users|project grow/i.test(question))return 'growth';
 if(/world cup|nba|basketball championship/i.test(question))return 'sports';
 if(/\b(job|career|hired|student|school)\b/i.test(question))return 'general';
 if(/\b(EVs?|electric vehicles|global|inflation|election|economy|climate|technology)\b/i.test(question))return 'world';
 return 'general';
}
export function planFor(question:string,known:Facts):Plan {
 const topic=topicFor(question),provided=inferFacts(question,topic);
 if(topic==='learning'&&known.learning_target!==learningTarget(question).target)known={...known,level:'',practice:'',conversation:''};
 const cards=registry[topic].filter(c=>!provided[c.id]&&(!c.remember || !known[c.id])).map(c=>topic==='learning'&&c.id==='conversation'?{...c,question:learningTarget(question).language?'How often can you practice conversation?':'How often can someone review your practice?'}:c);
 const context=topic==='sports'?[card('session_form','How has your contender looked recently?',['Strong recent form','Mixed recent form','I have no current form data'],false),card('session_availability','What do you know about player availability?',['Full squad expected','Key players unavailable','I have no current squad data'],false),card('session_advantage','What advantage matters in this event?',['Home advantage','More recovery time','No known advantage'],false)]:topic==='learning'?[card('session_break','Any interruption ahead in your practice?',['No planned break','A short travel break','A busy season ahead'],false),card('session_use','Where will you use this skill next?',['At work','During travel','With friends'],false),card('session_feedback','Is your access to feedback changing?',['No change','More feedback available','Less feedback available'],false)]:[card('session_priority','What matters most in this forecast?',['Speed','Stability','Opportunity'],false),card('session_change','What is different about this situation?',['New opportunity','New constraint','No major change'],false),card('session_confidence','How settled is your current plan?',['Still exploring','Mostly decided','Ready to act'],false)];
 return adaptPlan({topic,provided,cards:[...cards,...context.slice(0,Math.max(0,3-cards.length))].slice(0,10)},provided);
}
export function leadingNumber(value:string|undefined,name:string,max:number):number {
 return numeric((value||'').match(/\d+(?:\.\d+)?/)?.[0],name,0,max);
}
export function numeric(value:string|undefined,name:string,min=0,max=1e10):number {
 const n=Number((value||'').replace(/[,$£€]/g,''));
 if(!value?.trim()||!Number.isFinite(n)||n<min||n>max)throw new Error(`Please enter a number for ${name} between ${min} and ${max}.`);
 return n;
}
function wholeYears(value:string|undefined){const years=numeric(value,'years',1,50);if(!Number.isInteger(years))throw new Error('Please use a whole number of years between 1 and 50.');return years;}
function inflationRate(value:string|undefined){if(/^no\b/i.test(value||''))return 0;const rate=value?.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*%/)?.[1]||(/^[\d.]+$/.test(value||'')?value:undefined);return numeric(rate,'annual inflation (%)',0,20)/100;}
export function projection(f:Facts):number {
 const years=wholeYears(f.years),rate=numeric(f.return,'growth',0,20)/100;
 let balance=numeric(f.assets,'assets')-numeric(f.debt,'debt')+numeric(f.windfall,'one-off amount');
 let saving=numeric(f.monthly_saving,'monthly savings')*12;
 const increase=numeric(f.saving_growth,'savings growth',0,20)/100,withdraw=numeric(f.withdrawals,'withdrawals');
 for(let y=0;y<years;y++){balance=balance*(1+rate)+saving-withdraw;saving*=1+increase;}
 const inflation=inflationRate(f.inflation);
 return Math.round(balance/(1+inflation)**years);
}

export function learningTarget(question:string):{target:string;language:boolean}{
 const language=question.match(/\b(Spanish|Danish|French|German|English|Italian|Japanese|Korean|Chinese|Portuguese|Arabic|Hindi|Swedish|Norwegian)\b/i)?.[0];
 if(language)return {target:language[0].toUpperCase()+language.slice(1).toLowerCase(),language:true};
 const skill=question.match(/learn(?: to)? (.+?)(?: in | by | within | this |\?|$)/i)?.[1]||'your chosen skill';
 return {target:skill==='code'?'coding':skill.slice(0,35),language:false};
}
export function adaptPlan(plan:Plan,answers:Facts):Plan {
 if(plan.topic!=='sports')return plan;
 const competition={...plan.provided,...answers}.competition;
 const editions=competition==='Women’s World Cup'?['2027','2031','2035']:competition==='NBA championship'?['2027','2028','2029']:['2030','2034','2038'];
 const teams=competition==='NBA championship'?['Lakers, Celtics, Thunder','Warriors, Nuggets, Bucks','Knicks, Cavaliers, Rockets']:['Argentina, Spain, France','Brazil, England, Germany','USA, Portugal, Netherlands'];
 return {...plan,cards:plan.cards.map(c=>c.id==='edition'?{...c,options:[...editions,'Other']}:c.id==='team'?{...c,options:[...teams,'Other']}:c)};
}

export function inferFacts(question:string,topic:Topic):Facts {
 const q=question.toLowerCase().replace(/\bfour\b/g,'4').replace(/\bsix\b/g,'6').replace(/\bten\b/g,'10').replace(/\bthree\b/g,'3').replace(/\bone\b/g,'1').replace(/\ba year\b/g,'1 year');
 const provided:Facts={};
 const years=q.match(/(?:in|over|next)\s+(\d+)\s+years?/);
 const months=q.match(/(?:in|within|next)\s+(\d+)\s+months?/);
 if(topic==='money'&&years)provided.years=years[1];
 if(topic==='learning'){provided.learning_target=learningTarget(question).target;if(months)provided.deadline=`In ${months[1]} month${months[1]==='1'?'':'s'}`;else if(years)provided.deadline=`In ${years[1]} year${years[1]==='1'?'':'s'}`;else if(/this year|next year/.test(q))provided.deadline='In 1 year';}
 if(topic==='general'){const horizon=q.match(/\b(?:this|next) (?:year|month|week)|\b(?:in|within) \d+ (?:years?|months?|weeks?)|\bby 20\d{2}/)?.[0];if(horizon)provided.horizon=horizon;}
 if(topic==='sports'){const edition=q.match(/\b20\d{2}\b/)?.[0];if(edition)provided.edition=edition;if(/nba/.test(q))provided.competition='NBA championship';else if(/women.*world cup/.test(q))provided.competition='Women’s World Cup';else if(/men.*world cup/.test(q))provided.competition='Men’s World Cup';const team=question.match(/\b(Lakers|Celtics|Thunder|Argentina|Spain|Brazil|France)\b/i)?.[0];if(team)provided.team=team[0].toUpperCase()+team.slice(1).toLowerCase();}
 return provided;
}
export const factLabels:Record<string,string>={learning_target:'Learning goal',level:'Your level',practice:'Daily practice',conversation:'Practice feedback',currency:'Currency',assets:'Current assets',debt:'Current debt',monthly_saving:'Monthly savings',return:'Annual growth assumption',saving_growth:'Annual savings increase',withdrawals:'Annual withdrawals',location:'Current city',destination:'Possible next city',work:'Work flexibility',lease:'Lease timing',runway:'Savings runway',current_users:'Current users',weekly_growth:'Net weekly growth'};
export const currencies=['USD','EUR','GBP','DKK','SEK','NOK','JPY','CAD','AUD','CHF','INR'];
export function validateAnswer(topic:Topic,id:string,value:string):void {
 if(topic==='money'){
  if(id==='currency'&&!currencies.includes(value.toUpperCase()))throw new Error(`Use a currency code: ${currencies.join(', ')}.`);
  if(['assets','debt','monthly_saving','withdrawals','windfall'].includes(id))numeric(value,id);
  if(['return','saving_growth'].includes(id))numeric(value,id,0,20);
  if(id==='years')wholeYears(value);
  if(id==='inflation')inflationRate(value);
 }
 if(topic==='relocation'&&id==='runway')leadingNumber(value,'months of savings',600);
 if(topic==='learning'&&id==='practice')leadingNumber(value,'daily practice minutes',1440);
 if(topic==='growth'&&['current_users','weekly_growth','growth_weeks'].includes(id))numeric(value,id,id==='growth_weeks'?1:0,id==='growth_weeks'?520:1e10);
}
