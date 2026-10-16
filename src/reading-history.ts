import type {AccountState,Prediction} from './types';
import type {CircleForecast} from './social';
import {canRead} from './profile.ts';
import {freeLeft,starterReadings,type Balance} from './billing.ts';
import {countQuestion,questionsAsked} from './ladder.ts';

// The device's own count of free starter questions left, for the preview without a metering server.
export const localStarter=(state:Pick<AccountState,'ladder'|'history'>)=>Math.max(0,starterReadings-questionsAsked(state));
export function saveReading(state:AccountState,prediction:Prediction,day=new Date().toISOString().slice(0,10),charge=true):AccountState{
 if(!canRead(state)||state.history.some(p=>p.id===prediction.id))return state;
 const counted={...countQuestion(state),history:[prediction,...state.history]};
 if(!charge)return counted;
 const used=state.usage.day===day?state.usage.count:0,free=freeLeft({plus:state.plus,starter:localStarter(state),used})>0;
 return {...counted,usage:{day,count:used+1},credits:free?state.credits:Math.max(0,state.credits-1)};
}
export function circleReading(forecast:CircleForecast):Prediction{
 return {id:forecast.id,question:forecast.question,headline:forecast.headline,dueDate:forecast.due_date,createdAt:forecast.created_at,label:'For fun · Circle forecast',why:'A speculative glimpse shared with your Circle.',facts:{},sources:[],assumptions:[],friend:false,circleId:forecast.circle_id};
}
// Circle forecasts are charged by the server at publication; the device keeps only the asker's copy.
export function saveCircleReading(state:AccountState,forecast:CircleForecast):AccountState{
 if(!canRead(state)||state.history.some(p=>p.id===forecast.id))return state;
 return {...countQuestion(state),history:[circleReading(forecast),...state.history]};
}
// The server balance replaces the device's cached plan, packs, daily count and saved styles.
export function withBalance(state:AccountState,balance:Balance):AccountState{
 const yearAhead:AccountState['yearAhead']=balance.yearAhead?(state.balanceSnapshot?.owner===balance.owner&&state.yearAhead?state.yearAhead:{kind:'owned',source:balance.yearAhead}):undefined;
 return {...state,...(yearAhead||state.yearAhead?{yearAhead}:{}),balanceSnapshot:{owner:balance.owner,asOf:balance.asOf},plus:balance.plus,credits:balance.packs,...balance.starter===undefined?{}:{starter:balance.starter},usage:{day:balance.day,count:balance.used},...balance.ballStyle?{ballStyle:balance.ballStyle}:{},...balance.cardStyle?{cardStyle:balance.cardStyle}:{}};
}
