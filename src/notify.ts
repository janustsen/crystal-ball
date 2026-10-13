import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {planNotifications,type Planned,type PlanContext,type Candidate,type Delivered} from './ritual';
import {personalCheckInDue,localDay,suggestedCheckIn} from './retention';

// Foreground notifications are shown (social, check-ins), except the ritual's own: the app is already open.
if(Platform.OS!=='web')Notifications.setNotificationHandler({handleNotification:async notification=>{const ritual=!!notification.request.content.data?.ritual;return {shouldShowBanner:!ritual,shouldShowList:!ritual,shouldPlaySound:false,shouldSetBadge:false}}});

export async function allowNotifications(request:boolean){
 if(Platform.OS==='web')return false;
 return (await (request?Notifications.requestPermissionsAsync():Notifications.getPermissionsAsync())).status==='granted';
}
const budgetKey='crystal-ball-notification-budget-v1';
type Budget={scheduled:Record<string,number>;delivered:Delivered};
let work:Promise<unknown>=Promise.resolve();
async function readBudget():Promise<Budget>{
 const raw=await AsyncStorage.getItem(budgetKey);
 if(raw===null)return {scheduled:{},delivered:{}};
 const budget=JSON.parse(raw);
 if(!budget||!budget.scheduled||typeof budget.scheduled!=='object'||Array.isArray(budget.scheduled)||!budget.delivered||typeof budget.delivered!=='object'||Array.isArray(budget.delivered)||!Object.values(budget.scheduled).every(at=>typeof at==='number'&&Number.isFinite(at))||!Object.values(budget.delivered).every(ids=>Array.isArray(ids)&&ids.every(id=>typeof id==='string')))throw new Error('Notification budget is unreadable');
 return budget;
}
function consumeDue(budget:Budget){
 for(const [id,at] of Object.entries(budget.scheduled))if(at<=Date.now()){
  const day=localDay(new Date(at));budget.delivered[day]=[...new Set([...(budget.delivered[day]??[]),id])];delete budget.scheduled[id];
 }
}
const saveBudget=(budget:Budget)=>AsyncStorage.setItem(budgetKey,JSON.stringify(budget));
async function cancelPending(budget:Budget,all=false){
 for(const pending of await Notifications.getAllScheduledNotificationsAsync())if(all||pending.identifier.startsWith('ritual-')||pending.identifier.startsWith('check-in-')){
  await Notifications.cancelScheduledNotificationAsync(pending.identifier);
  consumeDue(budget);delete budget.scheduled[pending.identifier];await saveBudget(budget);
 }
 consumeDue(budget);budget.scheduled={};await saveBudget(budget);
}
export function scheduleRitual(state:PlanContext['state'],additional:Candidate[]=[]):Promise<Planned[]>{
 if(Platform.OS==='web')return Promise.resolve([]);
 const next=work.catch(()=>{}).then(async()=>{
  const budget=await readBudget();consumeDue(budget);await saveBudget(budget);
  if(!await allowNotifications(false))return [];
  await cancelPending(budget);
  const plan=planNotifications(state,new Date(),28,budget.delivered,additional);
  for(const p of plan){
   budget.scheduled[p.id]=p.at.getTime();await saveBudget(budget);
   await Notifications.scheduleNotificationAsync({identifier:p.id,content:{title:p.title,body:p.body,data:p.data},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:p.at}});
  }
  return plan;
 });
 work=next;return next;
}
export function forgetNotifications(){
 if(Platform.OS==='web')return Promise.resolve();
 const next=work.catch(()=>{}).then(async()=>{
  const budget=await readBudget();consumeDue(budget);await saveBudget(budget);
  await cancelPending(budget,true);
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.clearLastNotificationResponseAsync();
 });
 work=next;return next;
}
export async function previewNotifications(state:PlanContext['state']){
 await work.catch(()=>{});
 const budget=await readBudget();consumeDue(budget);
 return planNotifications(state,new Date(),28,budget.delivered);
}
export async function requestCheckIn(getState:()=>PlanContext['state'],id:string){
 if(Platform.OS==='web')return 'Native reminder preview: local notifications need an iOS or Android build.';
 try{
  if(!await allowNotifications(true))return 'Notifications are off. You can still check back from History.';
  const state=getState(),reading=state.history.find(p=>p.id===id);
  if(!reading||reading.circleId||reading.outcome)return 'Your check-in is saved. Return to History whenever you like.';
  if(personalCheckInDue(reading))return 'This forecast is ready for a Check-in. Open it from History.';
  const plan=await scheduleRitual(state);
  return plan.some(p=>p.data.checkIns&&localDay(p.at)===suggestedCheckIn(reading))?'Check-back reminder set. Forecasts due together share one evening notification.':'No reminder scheduled within your notification limits. You can still check back from History.';
 }catch{return 'The reminder could not be scheduled. You can still check back from History.'}
}
export async function testNotification(state:PlanContext['state']){
 if(!await allowNotifications(true))return false;
 const at=new Date();at.setMinutes(at.getMinutes()+1,0,0);
 const time=`${String(at.getHours()).padStart(2,'0')}:${String(at.getMinutes()).padStart(2,'0')}`;
 const plan=await scheduleRitual(state,[{id:'test',day:localDay(at),slot:'evening',priority:1000,title:'Crystal Ball',body:'Your insight is waiting.',data:{ritual:'test'},time}]);
 return plan.some(p=>p.data.ritual==='test');
}
export function watchRitualTaps(open:(kind:string)=>void){
 if(Platform.OS==='web')return ()=>{};
 const handle=(response:Notifications.NotificationResponse|null)=>{const kind=response?.notification.request.content.data?.ritual;if(typeof kind==='string'){open(kind);void Notifications.clearLastNotificationResponseAsync();}};
 handle(Notifications.getLastNotificationResponse());
 const listener=Notifications.addNotificationResponseReceivedListener(handle);
 return ()=>listener.remove();
}
