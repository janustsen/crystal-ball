import React,{useState} from 'react';
import {TextInput,View} from 'react-native';
import {Action,styles,Txt} from './ui';
import {useStore} from './store';
import {activityTheme} from './social-policy';
import {canRead} from './profile';
import {checkInCircles,setIdentity,searchHandles,requestInvite,answerInvite,blockHandle,prepareCircleForecast,voteCircleForecast,type Identity,type SocialSnapshot,type CircleForecastDraft} from './social';

type Act=(operation:()=>Promise<unknown>,message?:string)=>Promise<void>;
export function SocialIdentity({data,act,busy}:{data:SocialSnapshot;act:Act;busy:boolean}){
 const [handle,setHandle]=useState(data.profile?.handle??''),[name,setName]=useState(data.profile?.display_name??''),[avatar,setAvatar]=useState(data.profile?.avatar??'✦'),[query,setQuery]=useState(''),[results,setResults]=useState<Identity[]>([]);
 return <>
  <View style={styles.panel}><Txt>Your social profile</Txt><Txt style={styles.caption}>Your @handle, name and avatar appear in search. Teens are only findable by teens at their chosen school. Without a school, teens stay out of search.</Txt>
   <TextInput accessibilityLabel="Your handle" autoCapitalize="none" value={handle} onChangeText={setHandle} maxLength={24} placeholder="your_handle" style={styles.input}/>
   <TextInput accessibilityLabel="Display name" value={name} onChangeText={setName} maxLength={40} placeholder="Display name" style={styles.input}/>
   <View style={[styles.row,{flexWrap:'wrap'}]}>{['✦','🌙','☀️','🪐','🌸','🌊'].map(icon=><Action key={icon} label={`${avatar===icon?'✓ ':''}${icon}`} quiet onPress={()=>setAvatar(icon)}/>)}</View>
   <Action label="Save social profile" disabled={busy||!name.trim()||!/^[a-z0-9_]{3,24}$/.test(handle)} onPress={()=>void act(()=>setIdentity({handle,display_name:name,avatar}),'Social profile saved.')}/>
  </View>
  {data.profile?.handle?<View style={styles.panel}><Txt>Find an @handle</Txt><TextInput accessibilityLabel="Search handles" autoCapitalize="none" value={query} onChangeText={value=>{setQuery(value);setResults([])}} style={styles.input}/><Action label="Search people" disabled={busy||query.replace('@','').trim().length<2} onPress={()=>void act(async()=>setResults(await searchHandles(query)))}/>
   {results.map(person=><View key={person.handle} style={{marginTop:12}}><Txt>{person.avatar} {person.display_name} · @{person.handle}</Txt>{data.circles.filter(c=>c.owner_id===data.owner).map((circle)=><Action key={circle.id} label={`Invite @${person.handle} to Circle ${data.circles.findIndex(c=>c.id===circle.id)+1}`} quiet disabled={busy} onPress={()=>void act(()=>requestInvite(circle.id,person.handle),'Invitation sent. They choose whether to join.')}/>)}<Action label={`Block @${person.handle}`} quiet disabled={busy} onPress={()=>void act(async()=>{await blockHandle(person.handle);setResults(results.filter(p=>p.handle!==person.handle))},'Person blocked.')}/></View>)}
  </View>:null}
  {data.requests.map(request=><View key={request.id} style={styles.panel}><Txt>{request.avatar} @{request.handle} invited you to a Circle.</Txt><Txt style={styles.caption}>Joining shares your consultation days, themes, sun sign, check-in moments and golden draws. Group forecast questions and forecasts are visible to members.</Txt><Action label={`Accept @${request.handle} invitation`} disabled={busy||!data.profile?.handle} onPress={()=>void act(()=>answerInvite(request.id,true),'You joined the Circle.')}/><Action label={`Decline @${request.handle} invitation`} quiet disabled={busy} onPress={()=>void act(()=>answerInvite(request.id,false))}/></View>)}
 </>;
}
export function CircleForecasts({circle,data,act,busy,aiConsent,onPlus}:{circle:string;data:SocialSnapshot;act:Act;busy:boolean;aiConsent:string;onPlus:()=>void}){
 const {state,remaining,publishCircle,backupBusy}=useStore();
 const [question,setQuestion]=useState(''),[draft,setDraft]=useState<CircleForecastDraft|null>(null);
 const today=new Date().toISOString().slice(0,10),forecasts=data.forecasts.filter(f=>f.circle_id===circle),open=forecasts.some(f=>f.due_date>today);
 return <View style={{marginTop:20}}><Txt>Circle forecast</Txt>
  {forecasts.map(f=>{const tally=data.votes.find(v=>v.forecast_id===f.id);return <View key={f.id} style={styles.panel}><Txt>{f.question}</Txt><Txt display>{f.headline}</Txt><Txt style={styles.caption}>For fun · By {f.due_date}</Txt>{f.due_date<=today?<><Txt>Circle check-in · {tally?.yes??0} Yes · {tally?.no??0} Not quite · {tally?.pending??0} Not yet</Txt>{(['yes','no','pending'] as const).map(v=><Action key={v} label={`${tally?.mine===v?'✓ ':''}${v==='yes'?'Yes':v==='no'?'Not quite':'Not yet'}`} quiet disabled={busy} onPress={()=>void act(()=>voteCircleForecast(f.id,v))}/>)}</>:<Txt style={styles.caption}>Everyone can vote when the due date arrives.</Txt>}</View>})}
  {!open?<><Txt style={styles.caption}>Everyone in this Circle will see your question and forecast. Costs one Reading. One open forecast per Circle.</Txt><TextInput accessibilityLabel="Circle question" value={question} onChangeText={value=>{setQuestion(value);setDraft(null)}} maxLength={160} style={styles.input}/><Action label="Ask for the Circle" disabled={busy||backupBusy||!canRead(state)||question.trim().length<4} onPress={()=>{if(remaining<1){onPlus();return;}void act(async()=>setDraft(await prepareCircleForecast(circle,question,aiConsent)))}}/>
   {draft?<View style={styles.panel}><Txt>{draft.question}</Txt><Txt display>{draft.headline}</Txt><Txt style={styles.caption}>By {draft.due_date} · Visible to everyone in the Circle.</Txt><Action label="Share Circle forecast · 1 Reading" disabled={busy||backupBusy||remaining<1||!canRead(state)} onPress={()=>void act(async()=>{const forecast=await publishCircle(draft.id);void checkInCircles(activityTheme(forecast.question)).catch(()=>{});setDraft(null);setQuestion('')},'Circle forecast shared.')}/><Action label="Keep question private" quiet onPress={()=>setDraft(null)}/></View>:null}
  </>:<Txt style={styles.caption}>A forecast is open until its check-in.</Txt>}
 </View>;
}
