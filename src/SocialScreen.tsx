import {Paper} from './Paper';
import React,{useEffect,useRef,useState} from 'react';
import {Image,Platform,Pressable,Share,View} from 'react-native';
import * as Linking from 'expo-linking';
import {Input,Action,colors,Orb,styles,Txt,Toggle} from './ui';
import {sealedLink} from './social-links';
import {useStore} from './store';
import {SocialIdentity,CircleForecasts,InviteRequests} from './SocialExtras';
import {SocialPush} from './SocialPush';
import {SchoolPicker} from './SchoolPicker';
import type {Prediction,FriendTarget} from './types';
import {accountSocialProfile,sampleStars,skyPrompts,validFirstName,type SkyPrompt} from './social-policy';
import {manageCircle,sendSeal,blockMember,blockStarAuthor,createCircle,createSchoolCircleInvite,dismissFriendNotices,inviteToCircle,joinCircle,leaveCircle,loadSocial,openForecast,prepareSocialDraft,publishStar,reactInCircle,removeStar,reportStar,resonate,revokeSeal,sealForecast,setFriendConsent,type SocialDraft,type SocialSnapshot} from './social';

function LinkCard({url,onClose}:{url:string;onClose:()=>void}){
 const [notice,setNotice]=useState('');
 return <Paper style={styles.panel}><Txt>For someone you trust</Txt><Txt style={styles.caption}>{url.includes('circle=')?'One person · invitation expires in 7 days':'One recipient · available until revoked'}</Txt><Txt selectable testID="social-link" style={[styles.caption,{marginTop:12,color:colors.ice}]}>{url}</Txt><Action label="Share private link" onPress={()=>void Share.share({message:url,url}).catch(()=>setNotice('Sharing was canceled. You can copy the link above.'))}/>{notice?<Txt accessibilityLiveRegion="polite">{notice}</Txt>:null}<Action label="Close link" quiet onPress={onClose}/></Paper>;
}

export function SealForecast({prediction,aiConsent=''}:{prediction:Prediction;aiConsent?:string}){
 const {state}=useStore();
 const [draft,setDraft]=useState<SocialDraft|null>(null),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [recipients,setRecipients]=useState<SocialSnapshot|null>(null);
 if(!prediction.friend)return null;
 async function prepare(){setBusy(true);setNotice('');try{setDraft(await prepareSocialDraft('seal',prediction.headline,aiConsent));setRecipients(await loadSocial(accountSocialProfile(state)))}catch(error){setNotice(error instanceof Error?error.message:'This forecast could not be sealed.')}finally{setBusy(false)}}
 return <View style={{marginTop:12}}><Action label={busy?'Checking the wording…':'Seal for a friend'} quiet disabled={busy} onPress={()=>void prepare()}/>{draft?<Paper style={styles.panel}><Txt display style={styles.title}>A glimpse, just for them.</Txt><Txt>{draft.wording}</Txt><Txt style={[styles.caption,{marginTop:12}]}>Only this headline is sent. Your question and answers stay private.</Txt><Txt style={styles.caption}>{state.plus?'Plus · unlimited seals':'One free sealed forecast per week'}</Txt>{recipients?.members.filter((member,index,all)=>member.user_id!==recipients.owner&&all.findIndex(m=>m.user_id===member.user_id)===index).map(member=><Action key={member.user_id} label={`Send sealed forecast to ${member.display_name||member.handle||'Circle friend'}`} disabled={busy||!!url} onPress={()=>{setBusy(true);void sendSeal(draft,member.circle_id,member.user_id).then(()=>{setDraft(null);setNotice('Sealed forecast delivered.')}).catch(error=>setNotice(error.message)).finally(()=>setBusy(false))}}/>)}<Action label="Create sealed link" disabled={busy||!!url} onPress={()=>{setBusy(true);setNotice('');void Promise.resolve().then(()=>{sealedLink('');return sealForecast(draft)}).then(token=>setUrl(sealedLink(token))).catch(error=>setNotice(error instanceof Error?error.message:'The card could not be sealed.')).finally(()=>setBusy(false));}}/></Paper>:null}{notice?<Txt accessibilityLiveRegion="polite">{notice}</Txt>:null}{url?<LinkCard url={url} onClose={()=>setUrl('')}/>:null}</View>;
}

export function SealedCard({token,reduce}:{token:string;reduce:boolean}){
 const [headline,setHeadline]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{setHeadline('');setNotice('')},[token]);
 async function open(){setBusy(true);setNotice('');try{setHeadline(await openForecast(token))}catch(error){setNotice(error instanceof Error?error.message:'This seal is unavailable.')}finally{setBusy(false)}}
 return <Paper style={styles.panel}><Txt display style={styles.title}>{headline?'A glimpse for you.':'Someone sealed a glimpse for you.'}</Txt><Pressable testID="open-sealed-forecast" accessibilityRole="button" accessibilityLabel="Open sealed forecast" disabled={busy||!!headline} onPress={()=>void open()} style={{alignItems:'center',minHeight:52}}><Orb size={170} reduce={reduce} phase={headline?'reveal':'idle'}/></Pressable>{headline?<><Txt display>{headline}</Txt><Txt style={[styles.caption,{marginTop:12,color:colors.gold}]}>Speculative forecast · not a guarantee</Txt>{Platform.OS==='web'?<><Txt style={styles.caption}>Get Crystal Ball to ask your own questions.</Txt><Action label={process.env.EXPO_PUBLIC_INSTALL_URL?'Install Crystal Ball':'Open Crystal Ball app'} onPress={()=>void Linking.openURL(process.env.EXPO_PUBLIC_INSTALL_URL||'crystalball://').catch(()=>setNotice('Install Crystal Ball from your device’s app store to ask your own questions.'))}/></>:null}</>:<Txt style={styles.caption}>{busy?'Opening…':'Tap the ball to open. Only you can claim this card.'}</Txt>}{notice?<Txt accessibilityLiveRegion="polite">{notice}</Txt>:null}</Paper>;
}

export function Social({onAsk,onPlus,invite,onInviteHandled,seal,reduce,showCircles=false,aiConsent=''}:{showCircles?:boolean;aiConsent?:string;onAsk:(question:string,friend?:boolean,target?:FriendTarget)=>void;onPlus:()=>void;invite?:string;onInviteHandled:()=>void;seal?:string;reduce:boolean}){
 const {state,settleCircle}=useStore();
 const profile=accountSocialProfile(state);
 const [schoolOnly,setSchoolOnly]=useState(false);
 const schoolInvites=useRef(new Map<string,string>());
 const [friendEntry,setFriendEntry]=useState<Omit<FriendTarget,'firstName'>|null>(null),[firstName,setFirstName]=useState('');
 const [section,setSection]=useState<'sky'|'circles'>(invite||showCircles?'circles':'sky'),[selected,setSelected]=useState<SkyPrompt>('love');
 const [data,setData]=useState<SocialSnapshot|null>(null),[offline,setOffline]=useState(false),[connecting,setConnecting]=useState(false),[version,setVersion]=useState(0),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[link,setLink]=useState(''),[draft,setDraft]=useState<SocialDraft|null>(null),[joining,setJoining]=useState(!!invite),[confirmLeave,setConfirmLeave]=useState(''),[view,setView]=useState<string|null>(null);
 const lastView=useRef<string|null>(null),returnTo=useRef('');
 useEffect(()=>{if(invite){setSection('circles');setJoining(true)}},[invite]);
 useEffect(()=>{if(showCircles)setSection('circles')},[showCircles]);
 useEffect(()=>{
  let active=true;
  async function refresh(){setConnecting(true);try{const snapshot=await loadSocial(profile,schoolOnly);if(active){for(const forecast of snapshot.forecasts){if(forecast.asker_id===snapshot.owner&&forecast.charged_at===null)await settleCircle(forecast)}if(active){setData(snapshot);setOffline(false)}}}catch{if(active){setData(null);setOffline(true)}}finally{if(active)setConnecting(false)}}
  void refresh();const timer=setInterval(()=>void refresh(),30000);
  return()=>{active=false;clearInterval(timer)};
 },[version,profile.plus,profile.ageBand,profile.sunSign,schoolOnly]);
 async function act(operation:()=>Promise<unknown>,message=''){
  if(busy)return;setBusy(true);setNotice('');
  try{await operation();setNotice(message)}catch(error){setNotice(error instanceof Error?error.message:'The sky could not be reached. Try again.')}finally{setBusy(false);setVersion(v=>v+1)}
 }
 const stars=data?.schoolOnly===schoolOnly?data.stars:[],themeStars=stars.filter(star=>star.theme===selected),ownStar=data?.ownStar;
 const current=view&&data&&(['profile','friends','seals','school'].includes(view)||data.circles.some(c=>c.id===view))?view:null;
 // Destinations replace the overview; returning restores focus to the row that was opened.
 useEffect(()=>{
  const previous=lastView.current;lastView.current=current;
  if(Platform.OS!=='web'||previous===current)return;
  document.querySelector('[data-testid="screen-scroll"]')?.scrollTo({top:0});
  const target=document.querySelector<HTMLElement>(current?'[data-testid="circle-view-heading"]':`[data-testid="${returnTo.current}"]`);
  if(current)target?.setAttribute('tabindex','-1');target?.focus({preventScroll:true});
 },[current]);
 const destination=(id:string,title:string,summary:string,testID=`circle-view-${id}`)=><Pressable key={id} testID={testID} accessibilityRole="button" accessibilityLabel={`${title}. ${summary}`} onPress={()=>{setNotice('');returnTo.current=testID;setView(id)}} style={({pressed})=>[styles.row,{minHeight:56,paddingVertical:16,borderBottomWidth:0,borderColor:'#614C3466',opacity:pressed?.7:1}]}><View style={{flex:1}}><Txt>{title}</Txt><Txt style={[styles.caption,{marginTop:4}]}>{summary}</Txt></View><Txt accessible={false} style={{color:colors.ice,fontSize:20}}>›</Txt></Pressable>;
 const templates=Object.entries(skyPrompts) as [SkyPrompt,(typeof skyPrompts)[SkyPrompt]][];
 return <>
  <View style={[styles.row,{flexWrap:'wrap',marginBottom:20}]}>{(['sky','circles'] as const).map(part=><Pressable key={part} testID={`social-section-${part}`} accessibilityRole="button" accessibilityState={{selected:section===part}} onPress={()=>{setSection(part);setNotice('')}} style={{minHeight:48,justifyContent:'center',borderBottomWidth:section===part?1:0,borderColor:colors.gold}}><Txt style={{color:section===part?colors.gold:colors.muted}}>{part==='sky'?'Tonight’s Sky':'Circles'}</Txt></Pressable>)}</View>
  {offline&&section==='sky'?<View style={[styles.row,{marginBottom:8}]}><Txt accessibilityLiveRegion="polite" style={[styles.caption,{flex:1}]}>Showing sample stars while the sky is offline.</Txt><Pressable accessibilityRole="button" accessibilityLabel="Try connecting again" disabled={busy} onPress={()=>setVersion(v=>v+1)} style={{minWidth:44,minHeight:44,justifyContent:'center'}}><Txt style={{color:colors.gold}}>Retry</Txt></Pressable></View>:null}
  {data?<SchoolPicker schools={data.schools} selected={data.profile?.school_id??null} onSaved={()=>{setData(null);setSchoolOnly(false);setVersion(v=>v+1)}}/>:null}
  {seal?<SealedCard token={seal} reduce={reduce}/>:null}
  {section==='sky'?<>
   <Txt display style={styles.title}>What if?</Txt><Txt style={styles.caption}>Choose a theme to explore a question.</Txt>

   {!offline?<Txt style={[styles.caption,{marginTop:12}]}>{schoolOnly?`${stars.length} anonymous school stars today · no names or member list`:stars.length?`${stars.length} anonymous stars today · sample stars fill the quiet corners`:'Sample stars · a little inspiration until others arrive'}</Txt>:null}
   <View testID="tonights-sky" style={{minHeight:state.largeText?0:248,marginVertical:12,backgroundColor:'#17151b',overflow:'hidden',borderRadius:30,borderWidth:7,borderColor:'#3b2617',boxShadow:'inset 0 0 18px #050209, inset 0 0 0 1px #b48a5a66, 0 2px 0 #b48a5a55, 0 10px 14px #08040099',...(state.largeText?{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:4,paddingVertical:18,paddingHorizontal:18,borderRadius:28}: {})}}>
    <View pointerEvents="none" accessible={false} aria-hidden style={{position:'absolute',width:'100%',height:'100%'}}><Image source={require('../assets/apothecary/window.webp')} resizeMode="cover" style={{width:'100%',height:'100%',opacity:.45}}/><View style={{position:'absolute',width:'100%',height:'100%',backgroundColor:'#0b0812',opacity:.55}}/></View>
    {templates.map(([key,prompt])=>{
     const live=stars.filter(star=>star.theme===key),points=live.length?live:schoolOnly?[]:sampleStars.filter(star=>star.theme===key);
     return <Pressable key={key} testID={`sky-theme-${key}`} accessibilityRole="button" accessibilityLabel={`${prompt.label}, ${live.length?`${live.length} anonymous stars`:schoolOnly?'no school stars yet':'sample star'}`} accessibilityState={{selected:selected===key}} onPress={()=>{setSelected(key);setDraft(null)}} style={state.largeText?{width:'48%',paddingVertical:8,paddingHorizontal:4,minHeight:56,justifyContent:'center',borderBottomWidth:0,borderColor:selected===key?colors.gold:'#614C3466'}:{position:'absolute',left:`${prompt.x-16}%`,top:`${prompt.y-12}%`,width:'34%',minHeight:80,alignItems:'center',justifyContent:'center'}}>
      {!state.largeText?<View accessible={false} style={{flexDirection:'row',gap:3,alignItems:'center'}}>{points.slice(0,5).map((point,index)=><Txt key={point.id} allowFontScaling={false} style={{fontSize:index?13:26,lineHeight:30,color:selected===key?colors.gold:colors.lavender,transform:[{translateY:index%2?5:-3}]}}>✦</Txt>)}</View>:null}
      <Txt style={{color:selected===key?colors.gold:colors.ivory,fontSize:14,lineHeight:20}}>{selected===key?'✓ ':''}{prompt.label}</Txt>
     </Pressable>;
    })}
   </View>
   {schoolOnly&&!themeStars.length?<Paper style={styles.panel}><Txt>No school stars in {skyPrompts[selected].label.toLowerCase()} yet.</Txt><Txt style={styles.caption}>Prom, exams, a crush — ask the Ball and choose whether to share an anonymous Star.</Txt></Paper>:null}
   {!schoolOnly&&!themeStars.length?<Paper style={[styles.panel,{marginTop:0,paddingTop:12}]}><Txt style={styles.caption}>{skyPrompts[selected].label} · sample question</Txt><Txt display style={[styles.title,{fontSize:24,lineHeight:30,marginTop:8}]}>{skyPrompts[selected].question}</Txt><Action label="Ask this too" onPress={()=>onAsk(skyPrompts[selected].question)}/></Paper>:null}
   {themeStars.map((star,index)=><Paper key={star.id} style={styles.panel}><Txt style={styles.caption}>{star.mine?'Your star':'Anonymous star'} · {star.resonances} resonance{star.resonances===1?'':'s'}</Txt><Txt display style={[styles.title,{fontSize:24,lineHeight:30,marginTop:8}]}>{star.wording}</Txt><Action label={`Ask this too${index?` · ${index+1}`:''}`} onPress={()=>onAsk(star.wording)}/><Action label={star.resonated?'✦ Resonated':`✦ This resonates${index?` · ${index+1}`:''}`} quiet disabled={busy||star.resonated} onPress={()=>void act(()=>resonate(star.id))}/>{!star.mine?<View><Action label="Report this star" quiet disabled={busy} onPress={()=>void act(()=>reportStar(star.id),'Reported. Repeated reports hide a star automatically.')}/><Action label="Block this person" quiet disabled={busy} onPress={()=>void act(()=>blockStarAuthor(star.id),'This person is blocked. Their stars and activity are hidden.')}/></View>:null}</Paper>)}
   <Toggle accessibilityLabel="My school" value={schoolOnly} disabled={!data?.profile?.school_id} onValueChange={setSchoolOnly}/>{!data?.profile?.school_id?<Txt style={styles.caption}>Choose a school when connected to see its stars.</Txt>:null}
   <Action label={busy?'The Ball is checking…':'Add my star'} quiet disabled={busy||!!ownStar} onPress={()=>{const reading=state.history[0];if(!reading){onAsk('');return;}void act(async()=>{const next=await prepareSocialDraft('star',reading.question,aiConsent);setDraft(next);setSelected(next.theme)})}}/>
   {draft?<Paper style={styles.panel}><Txt>Approve your anonymous wording</Txt><Txt style={[styles.caption,{marginTop:8}]}>{draft.wording}</Txt><Txt style={[styles.caption,{marginTop:12}]}>Rewritten from your latest reading. No name, original question or answers. Visible today (UTC). One star per day.</Txt><Action label="Publish anonymous star" disabled={busy||!!ownStar} onPress={()=>void act(async()=>{await publishStar(draft);setDraft(null)},'Your star is in tonight’s sky.')}/><Action label="Keep it private" quiet onPress={()=>setDraft(null)}/></Paper>:null}
   {ownStar?<Action label="Remove my star" quiet disabled={busy} onPress={()=>void act(()=>removeStar(ownStar),'Your star was removed.')}/>:null}
  </>:offline?<View>
   <Txt accessibilityRole="header" display style={{fontSize:28,lineHeight:34}}>Circles are offline.</Txt>
   <Txt accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:12}]}>{connecting?'Checking your connection…':version>0?'Still offline. Try again later. Your circle setup is unavailable.':'We can’t check your circle or create one right now.'}</Txt>
   <Action testID="retry-circles" label={connecting?'Checking connection…':'Retry connection'} disabled={connecting} onPress={()=>setVersion(v=>v+1)}/>
   <Paper style={[styles.panel,{marginTop:24}]}><Txt display style={[styles.title,{fontSize:20,lineHeight:26}]}>Shared sky, private questions.</Txt><Txt style={styles.caption}>Friends share their day, theme and Sun sign. Never their question or forecast.</Txt></Paper>
   <Txt style={[styles.caption,{marginTop:16}]}>Circle setup returns when the connection is restored.</Txt>
   {joining&&invite?<><Txt style={[styles.caption,{marginTop:16}]}>Your invitation is waiting. Connect to review and join.</Txt><Action label="Decline invitation" quiet onPress={()=>{setJoining(false);onInviteHandled()}}/></>:null}
  </View>:<>
   {current&&data?<>
   <Pressable testID="circle-back" accessibilityRole="button" onPress={()=>setView(null)} style={{minHeight:48,alignSelf:'center',justifyContent:'center'}}><Txt style={{color:colors.ice}}>‹ Your little circle</Txt></Pressable>
   {current==='profile'?<><Txt testID="circle-view-heading" accessibilityRole="header" display style={styles.title}>Profile & people</Txt><SocialPush/><SocialIdentity key={data.owner} data={data} act={act} busy={busy}/></>:null}
   {current==='friends'?<><Txt testID="circle-view-heading" accessibilityRole="header" display style={styles.title}>Friend readings</Txt><Txt style={styles.caption}>Friends in your Circles can ask the Ball about you only when this is on. They are told nothing of your questions.</Txt>
   <Paper style={styles.panel}><Toggle accessibilityLabel="Friends can ask about me" disabled={busy||data?.profile?.age_band!=='adult'} value={data?.profile?.friends_can_ask===true} onValueChange={allowed=>void act(()=>setFriendConsent(allowed))}/><Txt style={styles.caption}>{!data?'Eligibility unavailable offline.':data.profile?.age_band==='adult'?'Off unless you choose. Only your sun sign and shared themes are used.':'Off for teens and unknown ages.'}</Txt></Paper>
   </>:null}
   {current==='school'?<><Txt testID="circle-view-heading" accessibilityRole="header" display style={styles.title}>School suggestions</Txt>
   {data?.profile?.school_id?<Paper style={styles.panel}><Txt>School Circle suggestions</Txt><Txt style={styles.caption}>Only friends you directly invited or who invited you, at your chosen school. No school directory.</Txt>
    {!data.schoolSuggestions.length?<Txt style={styles.caption}>No invited school friends yet. Use a private invitation with someone you already know.</Txt>:null}
    {data.schoolSuggestions.filter((suggestion,index,all)=>all.findIndex(s=>s.user_id===suggestion.user_id)===index).map(suggestion=>{
     const circleIndex=data.circles.findIndex(c=>c.id===suggestion.circle_id),friendIndex=data.members.filter(m=>m.circle_id===suggestion.circle_id).findIndex(m=>m.user_id===suggestion.user_id);
     return <View key={suggestion.user_id}><Txt style={styles.caption}>Friend {friendIndex+1} in Circle {circleIndex+1} chose your school.</Txt><Action label={`Start a school circle · Friend ${friendIndex+1} in Circle ${circleIndex+1}`} quiet disabled={busy} onPress={()=>void act(async()=>{const key=JSON.stringify([data.owner,data.profile?.school_id,suggestion.user_id]);const token=await createSchoolCircleInvite(schoolInvites.current.get(key));schoolInvites.current.set(key,token);setLink(Linking.createURL('/',{queryParams:{circle:token}}))},'Share this private invitation with your school friend. They choose whether to join.')}/></View>;
    })}
   </Paper>:null}
   </>:null}
   {current==='seals'?<><Txt testID="circle-view-heading" accessibilityRole="header" display style={styles.title}>Sent seals</Txt><Txt style={styles.caption}>Glimpses you sealed for a friend. Revoke any card you no longer want opened.</Txt>
   {data?.seals.map(card=><Paper key={card.id} style={styles.panel}><Txt>{card.opened_at?'Opened':'Sealed'} · {card.headline}</Txt><Action label="Show sealed link" quiet onPress={()=>{try{setLink(sealedLink(card.token))}catch(error){setNotice(error instanceof Error?error.message:'The card could not be shared.')}}}/><Action label="Revoke this card" quiet disabled={busy} onPress={()=>void act(()=>revokeSeal(card.id),'Card revoked.')}/></Paper>)}
   </>:null}
   {data.circles.map((circle,index)=>circle.id!==current?null:(()=>{
    const owner=circle.owner_id===data.owner,members=data.members.filter(member=>member.circle_id===circle.id);
    return <Paper key={circle.id} style={styles.panel}><Txt testID="circle-view-heading" accessibilityRole="header" display style={styles.title}>Circle {index+1}</Txt><Txt style={styles.caption}>{members.length} of 20 stars</Txt>{data.glows.some(g=>g.circle_id===circle.id&&g.day===new Date().toISOString().slice(0,10))?<Txt>✨ Circle glow · everyone consulted today</Txt>:null}{data.glows.filter(g=>g.circle_id===circle.id).length?<Txt style={styles.caption}>{data.glows.filter(g=>g.circle_id===circle.id).length} glow days · nothing to lose</Txt>:null}{members.map((member,i)=>{
     const mine=member.user_id===data.owner,today=member.consulted_on===new Date().toISOString().slice(0,10),reactions=data.reactions.filter(r=>r.circle_id===circle.id&&r.target_id===member.user_id);
     return <View key={member.user_id} style={{marginTop:16}}><Txt>{member.avatar} {mine?'You':member.display_name||`Friend ${i+1}`} {member.handle?`@${member.handle}`:''} · {member.sun_sign||'sun sign private'} · {today?'consulted today':member.consulted_on?`consulted ${member.consulted_on}`:'quiet for now'}</Txt>{member.theme?<Txt style={styles.caption}>{skyPrompts[member.theme]?.label||'Growth'}</Txt>:null}{!mine?<>{owner?<><Action label={`Remove ${member.display_name||`Friend ${i+1}`}`} quiet disabled={busy} onPress={()=>void act(()=>manageCircle(circle.id,member.user_id,'remove'))}/><Action label={`Transfer ownership to ${member.display_name||`Friend ${i+1}`}`} quiet disabled={busy} onPress={()=>void act(()=>manageCircle(circle.id,member.user_id,'transfer'))}/></>:null}<Action label={`Ask about Friend ${i+1}`} quiet disabled={busy||!member.can_ask} onPress={()=>{if(!state.plus){onPlus();return;}setFirstName('');setFriendEntry({circle:circle.id,member:member.user_id})}}/>{!member.can_ask?<Txt style={styles.caption}>Friend readings are off for this person.</Txt>:null}<Action label={`Block Friend ${i+1}`} quiet disabled={busy} onPress={()=>void act(()=>blockMember(member.user_id),'This person is blocked.')}/></>:null}<View><Txt style={styles.caption}>{reactions.map(r=>r.emoji).join(' ')} · {reactions.length} reactions</Txt>{!mine?<View style={[styles.row,{flexWrap:'wrap'}]}>{['❤️','🌙','✨'].map(emoji=><Action key={emoji} label={`${emoji} for Friend ${i+1}`} quiet disabled={busy} onPress={()=>void act(()=>reactInCircle(circle.id,member.user_id,emoji))}/>)}</View>:null}{today?<><Txt style={styles.caption}>Stars of encouragement</Txt>{!mine?<Action label={`Send a star to Friend ${i+1}`} quiet disabled={busy||reactions.some(r=>r.user_id===data.owner)} onPress={()=>void act(()=>reactInCircle(circle.id,member.user_id),'A little encouragement sent.')}/>:null}</>:null}</View></View>;
    })}{data.moments.filter(m=>m.circle_id===circle.id).map(moment=><Txt key={moment.id} style={styles.caption}>{data.members.find(m=>m.user_id===moment.user_id)?.display_name||'A member'} · {moment.day} · {moment.kind==='golden'?'Golden draw':moment.kind==='yes'?'Came true':'Not quite yet'}</Txt>)}<CircleForecasts circle={circle.id} data={data} act={act} busy={busy} aiConsent={aiConsent} onPlus={onPlus}/>{owner?<Action label="Invite a friend" quiet disabled={busy} onPress={()=>void act(async()=>{const token=await inviteToCircle(circle.id);setLink(Linking.createURL('/',{queryParams:{circle:token}}))})}/>:null}<Action label="Leave this circle" quiet onPress={()=>setConfirmLeave(circle.id)}/>{confirmLeave===circle.id?<><Txt style={styles.caption}>{owner?'Leave? Ownership passes to the earliest remaining member.':'Stop sharing your activity with this circle?'}</Txt><Action label="Yes, leave the circle" disabled={busy} onPress={()=>void act(async()=>{await leaveCircle(circle.id);setConfirmLeave('');setView(null)},'Circle left.')}/><Action label="Keep my place" quiet onPress={()=>setConfirmLeave('')}/></>:null}</Paper>;
   })())}
   {friendEntry?<Paper style={styles.panel}><Txt>What is this friend’s first name?</Txt><Input accessibilityLabel="Friend’s first name" value={firstName} onChangeText={setFirstName} maxLength={40} style={styles.input}/><Action label="Ask about this friend" disabled={busy||!validFirstName(firstName.trim())||!data?.members.some(m=>m.circle_id===friendEntry.circle&&m.user_id===friendEntry.member&&m.can_ask)} onPress={()=>{const name=firstName.trim();if(!validFirstName(name))return;if(!state.plus){onPlus();return;}onAsk(`What lies ahead for ${name}?`,true,{...friendEntry,firstName:name})}}/><Txt style={styles.caption}>Only their sun sign and shared themes inform the reading. They are told someone asked, never what.</Txt></Paper>:null}
  </>:<>
   <Txt display>Your little circle.</Txt><Txt style={[styles.caption,{marginTop:8}]}>Friends by invitation. Personal questions stay private. Only Circle forecast questions are shared.</Txt>
   {data&&!data.profile?.handle?<><SocialPush/><SocialIdentity key={data.owner} data={data} act={act} busy={busy}/></>:null}
   {data?<InviteRequests data={data} act={act} busy={busy}/>:null}
   {joining&&invite?<Paper style={styles.panel}><Txt>A place in someone’s circle</Txt><Txt style={styles.caption}>Choose your handle above. Joining shares future consultation days, themes, sun sign, check-in moments and golden draws with up to 20 members. Leave whenever you like.</Txt><Action label="Join this circle" disabled={busy||!data?.profile?.handle} onPress={()=>void act(async()=>{await joinCircle(invite);setJoining(false);onInviteHandled()},'You joined the circle.')}/><Action label="Decline invitation" quiet onPress={()=>{setJoining(false);onInviteHandled()}}/></Paper>:null}
   {data?.notices?<Paper style={styles.panel}><Txt>Someone asked about you.</Txt><Txt style={styles.caption}>Their question and forecast stay private.</Txt><Action label="Got it" quiet onPress={()=>void act(()=>dismissFriendNotices())}/></Paper>:null}
   {data?.receivedSeals.map(card=><SealedCard key={card.token} token={card.token} reduce={reduce}/>)}
   {data?.profile?.handle?<View testID="circle-destinations" style={{marginTop:16}}>
    {data.circles.map((circle,index)=>{const members=data.members.filter(m=>m.circle_id===circle.id).length,glow=data.glows.some(g=>g.circle_id===circle.id&&g.day===new Date().toISOString().slice(0,10)),open=data.forecasts.some(f=>f.circle_id===circle.id);return destination(circle.id,`Circle ${index+1}`,`${members} of 20 stars${glow?' · Circle glow today':''}${open?' · Circle forecast':''}`,`circle-view-${index+1}`)})}
    {destination('profile','Profile & people',`@${data.profile.handle} · find friends by handle`)}
    {destination('friends','Friend readings',data.profile.friends_can_ask?'On · only your sun sign and shared themes':'Off unless you choose')}
    {data.seals.length?destination('seals','Sent seals',`${data.seals.length} sealed · ${data.seals.filter(c=>c.opened_at).length} opened`):null}
    {data.profile.school_id?destination('school','School suggestions',data.schoolSuggestions.length?`${data.schoolSuggestions.length} invited school friends`:'Only friends you invited, never a directory'):null}
   </View>:null}
   {data&&(data.circles.length<(state.plus?10:5))?<Paper style={styles.panel}><Txt style={styles.caption}>Up to 5 Circles, or 10 with Plus. Each Circle holds 20 people.</Txt><Action testID="create-my-circle" label={!data?(offline?'Create my circle · offline':'Loading circles…'):'Create my circle'} disabled={busy||!data?.profile?.handle} onPress={()=>void act(()=>createCircle(),'Circle created. Invite your first friend.')}/></Paper>:null}
  </>}
  </>}
  {link?<LinkCard url={link} onClose={()=>setLink('')}/>:null}
  {notice?<Paper style={styles.panel}><Txt accessibilityLiveRegion="polite">{notice}</Txt><Action label="Dismiss social notice" quiet onPress={()=>setNotice('')}/></Paper>:null}

 </>;
}
