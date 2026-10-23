import Constants from 'expo-constants';
import {currentOmen} from './retention';
import type {Omen} from './daily-omen';
let updated='';
export async function updateOmenWidget(omen:Omen|null,strict=false){
 omen=currentOmen(omen);
 const key=JSON.stringify([omen,new Date().getTimezoneOffset()]);
 if(Constants.appOwnership==='expo'||(!strict&&updated===key))return;
 try{
  const widget:typeof import('./OmenWidget').default=require('./OmenWidget').default;
  const tomorrow=new Date();tomorrow.setHours(0,0,0,0);tomorrow.setDate(tomorrow.getDate()+1);
  await widget.updateTimeline([
   {date:new Date(),props:{text:omen?(omen.text??'The stars are quiet today.'):'Open the Ball for your personal insight.'}},
   {date:tomorrow,props:{text:'Open the Ball for today’s insight.'}},
  ]);updated=key;
 }catch(error){if(strict)throw error}
}
