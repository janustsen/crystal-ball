import Constants from 'expo-constants';
import {dailyOmen,localDay} from './retention';
let updated='';
export function updateOmenWidget(){
 const key=`${localDay()}:${new Date().getTimezoneOffset()}`;
 if(Constants.appOwnership==='expo'||updated===key)return;
 try{
  const widget:typeof import('./OmenWidget').default=require('./OmenWidget').default;
  // ponytail: one year of offline entries; reopening Home renews the timeline.
  const entries=Array.from({length:366},(_,i)=>{const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()+i);return {date,props:{text:dailyOmen(date).text}}});
  widget.updateTimeline(entries);updated=key;
 }catch{/* Expo Go and builds without the widget extension keep Home's omen. */}
}
