import type {AccountState,Prediction} from './types';
import type {CircleForecast} from './social';
import {canRead} from './profile.ts';

export function saveReading(state:AccountState,prediction:Prediction,day=new Date().toISOString().slice(0,10)):AccountState{
 if(!canRead(state)||state.history.some(p=>p.id===prediction.id))return state;
 const count=state.usage.day===day?state.usage.count:0,allowance=state.plus?10:1;
 return {...state,history:[prediction,...state.history],usage:{day,count:count+1},credits:count>=allowance?Math.max(0,state.credits-1):state.credits};
}
export function circleReading(forecast:CircleForecast):Prediction{
 return {id:forecast.id,question:forecast.question,headline:forecast.headline,dueDate:forecast.due_date,createdAt:forecast.created_at,label:'For fun · Circle forecast',why:'A speculative glimpse shared with your Circle.',facts:{},sources:[],assumptions:[],friend:false,circleId:forecast.circle_id};
}
export async function settleCircleReading(state:AccountState,forecast:CircleForecast,persist:(next:AccountState)=>Promise<void>,mark:(id:string)=>Promise<unknown>,saveToHistory=false):Promise<void>{
 if(forecast.charged_at!==null)return;
 if(!canRead(state))throw new Error('Finish onboarding before charging a Circle reading.');
 if(!state.circleCharges?.includes(forecast.id)){
  const saved=state.history.some(p=>p.id===forecast.id);
  const charged=saved?state:saveReading(state,circleReading(forecast));
  const next={...charged,history:saveToHistory?charged.history:state.history,circleCharges:[...(state.circleCharges??[]),forecast.id]};
  await persist(next);
 }
 await mark(forecast.id);
}
