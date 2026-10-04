import type {AccountState,Prediction} from './types';
import type {CircleForecast} from './social';
import {canRead} from './profile.ts';
import {dailyReadings,type Balance} from './billing.ts';

export function saveReading(state:AccountState,prediction:Prediction,day=new Date().toISOString().slice(0,10)):AccountState{
 if(!canRead(state)||state.history.some(p=>p.id===prediction.id))return state;
 const count=state.usage.day===day?state.usage.count:0,allowance=dailyReadings(state.plus);
 return {...state,history:[prediction,...state.history],usage:{day,count:count+1},credits:count>=allowance?Math.max(0,state.credits-1):state.credits};
}
export function circleReading(forecast:CircleForecast):Prediction{
 return {id:forecast.id,question:forecast.question,headline:forecast.headline,dueDate:forecast.due_date,createdAt:forecast.created_at,label:'For fun · Circle forecast',why:'A speculative glimpse shared with your Circle.',facts:{},sources:[],assumptions:[],friend:false,circleId:forecast.circle_id};
}
// Circle forecasts are charged by the server at publication; the device keeps only the asker's copy.
export function saveCircleReading(state:AccountState,forecast:CircleForecast):AccountState{
 if(!canRead(state)||state.history.some(p=>p.id===forecast.id))return state;
 return {...state,history:[circleReading(forecast),...state.history]};
}
// The server balance replaces the device's cached plan, packs and daily count.
export function withBalance(state:AccountState,balance:Balance):AccountState{
 return {...state,plus:balance.plus,credits:balance.packs,usage:{day:balance.day,count:balance.used}};
}
