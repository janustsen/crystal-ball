import type {AccountState,Prediction} from './types';
import type {CircleForecast,SocialSnapshot} from './social';
import {canRead} from './profile';

export function saveReading(state:AccountState,prediction:Prediction,day=new Date().toISOString().slice(0,10)):AccountState{
 if(!canRead(state)||state.history.some(p=>p.id===prediction.id))return state;
 const count=state.usage.day===day?state.usage.count:0,allowance=state.plus?10:1;
 return {...state,history:[prediction,...state.history],usage:{day,count:count+1},credits:count>=allowance?Math.max(0,state.credits-1):state.credits};
}
export function circleReading(forecast:CircleForecast):Prediction{
 return {id:forecast.id,question:forecast.question,headline:forecast.headline,dueDate:forecast.due_date,createdAt:forecast.created_at,label:'For fun · Circle forecast',why:'A speculative glimpse shared with your Circle.',facts:{},sources:[],assumptions:[],friend:false,circleId:forecast.circle_id};
}
export function reconcileCircleReadings(state:AccountState,snapshot:Pick<SocialSnapshot,'owner'|'forecasts'>,day=new Date().toISOString().slice(0,10)):AccountState{
 return snapshot.forecasts.filter(f=>f.asker_id===snapshot.owner&&f.due_date>day).reduce((next,f)=>saveReading(next,circleReading(f),day),state);
}
