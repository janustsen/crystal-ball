import type { Card, Facts, Plan, Topic } from '../src/types.ts';
const card=(id:string,question:string,options:string[],remember=true):Card=>({id,question,options:[...options,'Other'],remember});
export const registry: Record<Topic,Card[]> = {
 money:[card('currency','Which currency should the Ball use?',['USD','EUR','GBP']),card('assets','What are your assets worth today?',['0','25000','100000']),card('debt','How much debt do you have?',['0','10000','50000']),card('monthly_saving','How much do you save each month?',['100','500','1500']),card('years','How many years ahead?',['5','10','20'],false),card('return','Which annual growth assumption fits?',['3','5','7']),card('saving_growth','How much will annual savings grow (%)?',['0','2','5']),card('withdrawals','How much will you withdraw each year?',['0','1000','5000']),card('windfall','Any one-off amount to add now?',['0','5000','20000'],false),card('inflation','Should the number account for inflation?',['No, future money','Yes, assume 2%','Yes, assume 3%'],false)],
 learning:[card('level','What is your Spanish level now?',['New beginner','Know the basics','Intermediate']),card('practice','How much time can you give it daily?',['10 minutes','20 minutes','45 minutes']),card('conversation','How often can you speak with someone?',['Rarely','Weekly','Daily']),card('deadline','When do you want to use it?',['In 3 months','In 6 months','In a year'],false)],
 relocation:[card('location','Where do you live now?',['Boston','London','Copenhagen']),card('destination','Which city are you considering?',['Chicago','Berlin','Barcelona']),card('work','How flexible is your work?',['Remote','Need a new job','Already have an offer']),card('lease','When can you leave your current home?',['Within 3 months','Within 6 months','Next year']),card('runway','How many months could your savings cover?',['1 month','3 months','6 months'])],
 growth:[card('current_users','How many people use your project today?',['0','100','1000']),card('weekly_growth','How many net new users join each week?',['2','10','50']),card('growth_weeks','How many weeks ahead?',['4','12','26'],false),card('retention','How often do users return?',['Rarely','Weekly','Daily'])],
 sports:[card('competition','Which competition do you mean?',['Men’s World Cup','Women’s World Cup','NBA championship'],false),card('edition','Which edition?',['2027','2030','2034'],false),card('team','Which team is your pick?',['Argentina','Spain','USA'],false)],
 general:[card('goal','What result are you hoping for?',['A new beginning','Steady progress','A big breakthrough'],false),card('horizon','How far ahead should we look?',['3 months','6 months','1 year'],false),card('effort','How much effort can you give it?',['A little each week','Most days','Every day']),card('obstacle','What gets in your way most?',['Time','Confidence','Resources'],false)],
};
export function topicFor(question:string):Topic {
 if(/net worth|savings|wealth|money in|worth in/i.test(question))return 'money';
 if(/spanish|learn|fluent|language/i.test(question))return 'learning';
 if(/move|live next|relocat/i.test(question))return 'relocation';
 if(/users|project grow|customers/i.test(question))return 'growth';
 if(/world cup|nba|win.*(match|final|league|championship)/i.test(question))return 'sports';
 return 'general';
}
export function planFor(question:string,known:Facts):Plan {
 const topic=topicFor(question);
 const cards=registry[topic].filter(c=>!c.remember || !known[c.id]);
 const context=[card('session_priority','What matters most in this forecast?',['Speed','Stability','Opportunity'],false),card('session_change','What is different about this situation?',['New opportunity','New constraint','No major change'],false),card('session_confidence','How settled is your current plan?',['Still exploring','Mostly decided','Ready to act'],false)];
 return {topic,cards:[...cards,...context.slice(0,Math.max(0,3-cards.length))].slice(0,10)};
}
export function numeric(value:string|undefined,name:string,min=0,max=1e10):number {
 const n=Number((value||'').replace(/[,$£€]/g,''));
 if(!value?.trim()||!Number.isFinite(n)||n<min||n>max)throw new Error(`Please enter a number for ${name} between ${min} and ${max}.`);
 return n;
}
export function projection(f:Facts):number {
 const years=numeric(f.years,'years',1,50),rate=numeric(f.return,'growth',0,20)/100;
 let balance=numeric(f.assets,'assets')-numeric(f.debt,'debt')+numeric(f.windfall,'one-off amount');
 let saving=numeric(f.monthly_saving,'monthly savings')*12;
 const increase=numeric(f.saving_growth,'savings growth',0,20)/100,withdraw=numeric(f.withdrawals,'withdrawals');
 for(let y=0;y<years;y++){balance=balance*(1+rate)+saving-withdraw;saving*=1+increase;}
 const inflation=f.inflation?.startsWith('Yes')?(f.inflation.includes('3%')?.03:.02):0;
 return Math.round(balance/(1+inflation)**years);
}
