import Constants from 'expo-constants';
import type {Omen} from './daily-omen';
let updated='';
export function updateOmenWidget(omen:Omen|null){
 const key=JSON.stringify([omen,new Date().getTimezoneOffset()]);
 if(Constants.appOwnership==='expo'||updated===key)return;
 try{
  const widget:typeof import('./OmenWidget').default=require('./OmenWidget').default;
  const tomorrow=new Date();tomorrow.setHours(0,0,0,0);tomorrow.setDate(tomorrow.getDate()+1);
  widget.updateTimeline([
   {date:new Date(),props:{text:omen?(omen.text??'The stars are quiet today.'):'Open the Ball for your personal omen.'}},
   {date:tomorrow,props:{text:'Open the Ball for today’s omen.'}},
  ]);updated=key;
 }catch{/* Expo Go and builds without the widget extension keep Home's omen. */}
}
