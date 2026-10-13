import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,Share,View} from 'react-native';
import * as Linking from 'expo-linking';
import {Action,CardHeader,colors,Orb,styles,Txt,Field,Toggle,Segmented} from './ui';
import {sealedLink} from './social-links';
import {useStore} from './store';
import {SocialIdentity,CircleForecasts} from './SocialExtras';
import {SocialPush,SkyPushPrompt} from './SocialPush';
import {SkyOmen} from './SkyOmen';
import {SchoolPicker} from './SchoolPicker';
import type {Prediction,FriendTarget} from './types';
import {accountSocialProfile,sampleStars,skyPrompts,socialUnavailable,validFirstName,type SkyPrompt} from './social-policy';
import {setSkyPush,manageCircle,sendSeal,blockMember,blockStarAuthor,createCircle,createSchoolCircleInvite,dismissFriendNotices,inviteToCircle,joinCircle,leaveCircle,loadSocial,openForecast,prepareSocialDraft,publishStar,reactInCircle,removeStar,reportStar,resonate,revokeSeal,sealForecast,setFriendConsent,type SocialDraft,type SocialSnapshot} from './social';
import {Surface} from './Surface';
import {Enter} from './Enter';

const skyStallMs=8000;

function LinkCard({url,onClose}:{url:string;onClose:()=>void}){
 const [notice,setNotice]=useState('');
 return <View style={styles.panel}><Surface kind="card"><Txt>For someone you trust</Txt><Txt style={styles.caption}>{url.includes('circle=')?'One person · invitation expires in 7 days':'One recipient · available until revoked'}</Txt><Txt selectable testID="social-link" style={[styles.caption,{marginTop:12,color:colors.ice}]}>{url}</Txt><Action label="Share private link" onPress={()=>void Share.share({message:url,url}).catch(()=>setNotice('Sharing was canceled. You can copy the link above.'))}/>{notice?<View style={styles.panel}><Surface kind="card"><Txt accessibilityLiveRegion="polite">{notice}</Txt></Surface></View>:null}<Action label="Close link" quiet onPress={onClose}/></Surface></View>;
}

export function SealForecast({prediction,aiConsent=''}:{prediction:Prediction;aiConsent?:string}){
 const {state}=useStore();
 const [draft,setDraft]=useState<SocialDraft|null>(null),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [recipients,setRecipients]=useState<SocialSnapshot|null>(null);
 async function prepare(){setBusy(true);setNotice('');try{setDraft(await prepareSocialDraft('seal',prediction.headline,aiConsent));setRecipients(await loadSocial(accountSocialProfile(state)))}catch(error){setNotice(error instanceof Error?error.message:'This forecast could not be sealed.')}finally{setBusy(false)}}
 return <View style={{marginTop:12}}><Action testID="seal-for-a-friend" label={busy?'Checking the wording…':'Seal it for a friend'} disabled={busy} onPress={()=>void prepare()}/>{draft?<View style={styles.panel}><Surface kind="card"><Txt display style={[styles.heading,{marginBottom:8}]}>A glimpse, just for them.</Txt><Txt>{draft.wording}</Txt><Txt style={[styles.caption,{marginTop:12}]}>Only this headline is sent. Your question and answers stay private.</Txt><Txt style={styles.caption}>{state.plus?'Plus · unlimited seals':'One free sealed forecast per week'}</Txt>{recipients?.members.filter((member,index,all)=>member.user_id!==recipients.owner&&all.findIndex(m=>m.user_id===member.user_id)===index).map(member=><Action key={member.user_id} label={`Send sealed forecast to ${member.display_name||member.handle||'Circle friend'}`} disabled={busy||!!url} onPress={()=>{setBusy(true);void sendSeal(draft,member.circle_id,member.user_id).then(()=>{setDraft(null);setNotice('Sealed forecast delivered.')}).catch(error=>setNotice(error.message)).finally(()=>setBusy(false))}}/>)}<Action label="Create sealed link" disabled={busy||!!url} onPress={()=>{setBusy(true);setNotice('');void Promise.resolve().then(()=>{sealedLink('');return sealForecast(draft)}).then(token=>setUrl(sealedLink(token))).catch(error=>setNotice(error instanceof Error?error.message:'The card could not be sealed.')).finally(()=>setBusy(false));}}/></Surface></View>:null}{notice?<View style={styles.panel}><Surface kind="card"><Txt accessibilityLiveRegion="polite">{notice}</Txt></Surface></View>:null}{url?<LinkCard url={url} onClose={()=>setUrl('')}/>:null}</View>;
}

export function InstallAction({onNotice}:{onNotice:(message:string)=>void}){
 return <Action label={process.env.EXPO_PUBLIC_INSTALL_URL?'Install Crystal Ball':'Open Crystal Ball app'} onPress={()=>void Linking.openURL(process.env.EXPO_PUBLIC_INSTALL_URL||'crystalball://').catch(()=>onNotice('Install Crystal Ball from your device’s app store to ask your own questions.'))}/>;
}

export function SealedCard({token,reduce,onAsk,webTrial=false}:{token:string;reduce:boolean;onAsk?:()=>void;webTrial?:boolean}){
 const [headline,setHeadline]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{setHeadline('');setNotice('')},[token]);
 async function open(){setBusy(true);setNotice('');try{setHeadline(await openForecast(token))}catch(error){setNotice(error instanceof Error?error.message:'This seal is unavailable.')}finally{setBusy(false)}}
 return <View style={styles.panel}><Surface kind="card"><Txt display style={[styles.heading,{marginBottom:8}]}>{headline?'A glimpse for you.':'Someone sealed a glimpse for you.'}</Txt><Pressable testID="open-sealed-forecast" accessibilityRole="button" accessibilityLabel="Open sealed forecast" disabled={busy||!!headline} onPress={()=>void open()} style={{alignItems:'center',minHeight:52}}><Orb size={170} reduce={reduce} phase={headline?'reveal':'idle'}/></Pressable>{headline?<><Txt display>{headline}</Txt><Txt style={[styles.caption,{marginTop:12,color:colors.gold}]}>Speculative forecast · not a guarantee</Txt></>:<Txt style={styles.caption}>{busy?'Opening…':'Tap the ball to open. Only you can claim this card.'}</Txt>}{notice?<View style={styles.panel}><Surface kind="card"><Txt accessibilityLiveRegion="polite">{notice}</Txt></Surface></View>:null}{Platform.OS==='web'&&(headline||notice)?<>{onAsk?<><Action testID="web-reading-start" label="Ask the Ball your own question" onPress={onAsk}/>{webTrial?<Txt style={styles.caption}>One free reading here. No account needed.</Txt>:null}</>:<Txt style={styles.caption}>Get Crystal Ball to ask your own questions.</Txt>}<InstallAction onNotice={setNotice}/></>:null}</Surface></View>;
}

export function Social({onAsk,onPlus,invite,onInviteHandled,seal,reduce,requestedSection,requestId,aiConsent=''}:{requestedSection?:'sky'|'circles';requestId?:string;aiConsent?:string;onAsk:(question:string,friend?:boolean,target?:FriendTarget)=>void;onPlus:()=>void;invite?:string;onInviteHandled:()=>void;seal?:string;reduce:boolean}){
 const {state}=useStore();
 const profile=accountSocialProfile(state);
 const [schoolOnly,setSchoolOnly]=useState(false);
 const schoolInvites=useRef(new Map<string,string>()),consentRevision=useRef(0);
 const [friendEntry,setFriendEntry]=useState<Omit<FriendTarget,'firstName'>|null>(null),[firstName,setFirstName]=useState('');
 const [section,setSection]=useState<'sky'|'circles'>(invite?'circles':requestedSection??'sky'),[selected,setSelected]=useState<SkyPrompt>('love');
 const [data,setData]=useState<SocialSnapshot|null>(null),[offline,setOffline]=useState(false),[version,setVersion]=useState(0),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[link,setLink]=useState(''),[draft,setDraft]=useState<SocialDraft|null>(null),[joining,setJoining]=useState(!!invite),[confirmLeave,setConfirmLeave]=useState('');
 useEffect(()=>{if(requestedSection)setSection(requestedSection)},[requestedSection,requestId]);
 useEffect(()=>{if(invite){setSection('circles');setJoining(true)}},[invite]);
 useEffect(()=>{
  let active=true,loaded=false;
  async function refresh(){const revision=consentRevision.current;try{const snapshot=await loadSocial(profile,schoolOnly);if(active&&revision===consentRevision.current){loaded=true;setData(snapshot);setOffline(false)}}catch{if(active&&revision===consentRevision.current)setOffline(true)}}
  void refresh();const timer=setInterval(()=>void refresh(),30000);
  // A read that stalls falls back to the offline view (samples and retry); a late answer still replaces it.
  const stalled=setTimeout(()=>{if(active&&!loaded)setOffline(true)},skyStallMs);
  return()=>{active=false;clearInterval(timer);clearTimeout(stalled)};
 },[version,profile.plus,profile.ageBand,profile.sunSign,schoolOnly]);
 function skyPushSaved(enabled:boolean){
  consentRevision.current++;
  setData(current=>current?.profile?{...current,profile:{...current.profile,sky_push:enabled,sky_push_answered:true}}:current);
 }
 async function act(operation:()=>Promise<unknown>,message=''){
  if(busy)return;setBusy(true);setNotice('');
  try{await operation();setNotice(message)}catch(error){setNotice(error instanceof Error?error.message:'The sky could not be reached. Try again.')}finally{setBusy(false);setVersion(v=>v+1)}
 }
 const stars=data?.schoolOnly===schoolOnly?data.stars:[],themeStars=stars.filter(star=>star.theme===selected),ownStar=data?.ownStar;
 const templates=Object.entries(skyPrompts) as [SkyPrompt,(typeof skyPrompts)[SkyPrompt]][];
 return <>
  <View style={{marginBottom:20}}><Segmented options={[{value:'sky',label:'Tonight’s Sky',testID:'social-section-sky'},{value:'circles',label:'Circles',testID:'social-section-circles'}]} value={section} reduce={reduce} onChange={part=>{setSection(part);setNotice('')}}/></View>
  {seal?<SealedCard token={seal} reduce={reduce}/>:null}
  {!data&&!offline?<Txt accessibilityLiveRegion="polite">Loading your sky…</Txt>:null}
  {data?<SchoolPicker schools={data.schools} selected={data.profile?.school_id??null} onSaved={id=>{setData(current=>current?.profile?{...current,profile:{...current.profile,school_id:id},stars:current.schoolOnly?[]:current.stars,schoolSuggestions:[]}:current);setSchoolOnly(false);setVersion(v=>v+1)}}/>:null}
  {data||offline?<Enter key={`${section}-${data?'loaded':'offline'}`} reduce={reduce} direction={section==='sky'?-1:1}>
  {section==='sky'?<>
   <Txt testID="sky-intro" display accessibilityRole="header" style={styles.hero}>A sky full of what-ifs.</Txt>
   {data?.profile?<SkyPushPrompt key={data.owner} answered={data.profile.sky_push_answered===true} onAnswered={skyPushSaved}/>:null}
   {data?.profile?.school_id?<View style={styles.panel}><Surface kind="card"><SkyOmen testID="sky-omen-school" omen={data.omens?.find(omen=>omen.school_id===data.profile?.school_id)} unavailable={!data.omens}/></Surface></View>:null}
   {data?.circles.map((circle,index)=><View key={circle.id} style={styles.panel}><Surface kind="card"><Txt>Circle {index+1}</Txt><SkyOmen testID={`sky-omen-circle-${index+1}`} omen={data.omens?.find(omen=>omen.circle_id===circle.id)} unavailable={!data.omens}/></Surface></View>)}
   <View testID="tonights-sky" style={styles.panel}><Surface kind="card">
    <CardHeader title="Tonight’s Sky" label={schoolOnly?'School':stars.length?'Live':'Samples'}/>
    {schoolOnly||stars.length?<Txt style={[styles.caption,{marginTop:6}]}>{`${stars.length} anonymous ${schoolOnly?'school ':''}star${stars.length===1?'':'s'} today`}</Txt>:null}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:14}}>{templates.map(([key,prompt])=>{
     const live=stars.filter(star=>star.theme===key),points=live.length?live:schoolOnly?[]:sampleStars.filter(star=>star.theme===key),on=selected===key;
     return <Pressable key={key} testID={`sky-theme-${key}`} accessibilityRole="button" accessibilityLabel={`${prompt.label}, ${live.length?`${live.length} anonymous stars`:schoolOnly?'no school stars yet':'sample star'}`} accessibilityState={{selected:on}} onPress={()=>{setSelected(key);setDraft(null)}} style={{minHeight:44,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:6}}>
      <Surface kind="chip" state={on?'selected':undefined}><Txt accessible={false} allowFontScaling={false} style={{fontSize:13,lineHeight:16,color:on?colors.onGold:colors.gold}}>{'✦'.repeat(Math.max(1,Math.min(3,points.length)))}</Txt><Txt style={styles.chip}>{prompt.label}</Txt></Surface>
     </Pressable>;
    })}</View>
    <View style={[styles.row,{marginTop:12}]}><Txt style={{flexShrink:1}}>My school</Txt><Toggle accessibilityLabel="My school" value={schoolOnly} disabled={!data?.profile?.school_id} onValueChange={setSchoolOnly}/></View>
   </Surface></View>
   {schoolOnly&&!themeStars.length?<View style={styles.panel}><Surface kind="card"><Txt>No school stars in {skyPrompts[selected].label.toLowerCase()} yet.</Txt><Txt style={styles.caption}>Prom, exams, a crush — ask the Ball and choose whether to share an anonymous Star.</Txt></Surface></View>:null}
   {!schoolOnly&&!themeStars.length?<View style={styles.panel}><Surface kind="card"><Txt style={styles.caption}>{skyPrompts[selected].label} · sample question</Txt><Txt display style={[styles.heading,{marginBottom:8,marginTop:12}]}>{skyPrompts[selected].question}</Txt><Action label="Ask this too" onPress={()=>onAsk(skyPrompts[selected].question)}/></Surface></View>:null}
   {themeStars.map((star,index)=><View key={star.id} style={styles.panel}><Surface kind="card"><Txt style={styles.caption}>{star.mine?'Your star':'Anonymous star'} · {star.resonances} resonance{star.resonances===1?'':'s'}</Txt><Txt display style={[styles.heading,{marginBottom:8,marginTop:12}]}>{star.wording}</Txt><Action label={`Ask this too${index?` · ${index+1}`:''}`} onPress={()=>onAsk(star.wording)}/><Action label={star.resonated?'✦ Resonated':`✦ This resonates${index?` · ${index+1}`:''}`} quiet disabled={busy||star.resonated} onPress={()=>void act(()=>resonate(star.id))}/>{!star.mine?<View><Action label="Report this star" quiet disabled={busy} onPress={()=>void act(()=>reportStar(star.id),'Reported. Repeated reports hide a star automatically.')}/><Action label="Block this person" quiet disabled={busy} onPress={()=>void act(()=>blockStarAuthor(star.id),'This person is blocked. Their stars and activity are hidden.')}/></View>:null}</Surface></View>)}
   <Action label={busy?'The Ball is checking…':'Add my star'} quiet disabled={busy||!!ownStar} onPress={()=>{const reading=state.history[0];if(!reading){onAsk('');return;}void act(async()=>{const next=await prepareSocialDraft('star',reading.question,aiConsent);setDraft(next);setSelected(next.theme)})}}/>
   {draft?<View style={styles.panel}><Surface kind="card"><Txt>Approve your anonymous wording</Txt><Txt style={[styles.caption,{marginTop:8}]}>{draft.wording}</Txt><Txt style={[styles.caption,{marginTop:12}]}>Rewritten from your latest reading. No name, original question or answers. Visible today (UTC). One star per day.</Txt><Action label="Publish anonymous star" disabled={busy||!!ownStar} onPress={()=>void act(async()=>{await publishStar(draft);setDraft(null)},'Your star is in tonight’s sky.')}/><Action label="Keep it private" quiet onPress={()=>setDraft(null)}/></Surface></View>:null}
   {ownStar?<Action label="Remove my star" quiet disabled={busy} onPress={()=>void act(()=>removeStar(ownStar),'Your star was removed.')}/>:null}
  </>:<>
   <Txt display accessibilityRole="header" style={styles.hero}>Your little circle.</Txt><SocialPush skyPush={data?.profile?.sky_push===true} onSkyPush={(enabled,token)=>act(async()=>{await setSkyPush(enabled,token);skyPushSaved(enabled)})}/>{data?<SocialIdentity key={data.owner} data={data} act={act} busy={busy}/>:null}
   {data?.profile?.school_id?<View style={styles.panel}><Surface kind="card"><CardHeader title="School Circle suggestions"/>
    {!data.schoolSuggestions.length?<Txt style={styles.caption}>No invited school friends yet. Use a private invitation with someone you already know.</Txt>:null}
    {data.schoolSuggestions.filter((suggestion,index,all)=>all.findIndex(s=>s.user_id===suggestion.user_id)===index).map(suggestion=>{
     const circleIndex=data.circles.findIndex(c=>c.id===suggestion.circle_id),friendIndex=data.members.filter(m=>m.circle_id===suggestion.circle_id).findIndex(m=>m.user_id===suggestion.user_id);
     return <View key={suggestion.user_id}><Txt style={styles.caption}>Friend {friendIndex+1} in Circle {circleIndex+1} chose your school.</Txt><Action label={`Start a school circle · Friend ${friendIndex+1} in Circle ${circleIndex+1}`} quiet disabled={busy} onPress={()=>void act(async()=>{const key=JSON.stringify([data.owner,data.profile?.school_id,suggestion.user_id]);const token=await createSchoolCircleInvite(schoolInvites.current.get(key));schoolInvites.current.set(key,token);setLink(Linking.createURL('/',{queryParams:{circle:token}}))},'Share this private invitation with your school friend. They choose whether to join.')}/></View>;
    })}
   </Surface></View>:null}
   {joining&&invite?<View style={styles.panel}><Surface kind="card"><CardHeader title="A place in someone’s circle"/><Txt style={[styles.caption,{marginTop:8}]}>Choose your handle above. Joining shares future consultation days, themes, sun sign, check-in moments and golden draws with up to 20 members. Leave whenever you like.</Txt><Action label="Join this circle" disabled={busy||!data?.profile?.handle} onPress={()=>void act(async()=>{await joinCircle(invite);setJoining(false);onInviteHandled()},'You joined the circle.')}/><Action label="Decline invitation" quiet onPress={()=>{setJoining(false);onInviteHandled()}}/></Surface></View>:null}
   {data&&(data.circles.length<(state.plus?10:5))?<View style={styles.panel}><Surface kind="card"><CardHeader title="A small sky of your own" label={`${data.circles.length} of ${state.plus?10:5}`}/><Action label="Create my circle" disabled={busy||!data?.profile?.handle} onPress={()=>void act(()=>createCircle(),'Circle created. Invite your first friend.')}/></Surface></View>:null}
   {data?.circles.map((circle,index)=>{
    const owner=circle.owner_id===data.owner,members=data.members.filter(member=>member.circle_id===circle.id);
    return <View key={circle.id} style={styles.panel}><Surface kind="card"><Txt display style={[styles.heading,{marginBottom:8}]}>Circle {index+1}</Txt><Txt style={styles.caption}>{members.length} of 20 stars</Txt><SkyOmen testID={`sky-omen-circle-${index+1}`} omen={data.omens?.find(omen=>omen.circle_id===circle.id)} unavailable={!data.omens}/>{data.glows.some(g=>g.circle_id===circle.id&&g.day===new Date().toISOString().slice(0,10))?<Txt>✨ Circle glow · everyone consulted today</Txt>:null}{data.glows.filter(g=>g.circle_id===circle.id).length?<Txt style={styles.caption}>{data.glows.filter(g=>g.circle_id===circle.id).length} glow days · nothing to lose</Txt>:null}{members.map((member,i)=>{
     const mine=member.user_id===data.owner,today=member.consulted_on===new Date().toISOString().slice(0,10),reactions=data.reactions.filter(r=>r.circle_id===circle.id&&r.target_id===member.user_id);
     return <View key={member.user_id} style={{marginTop:16}}><Txt>{member.avatar} {mine?'You':member.display_name||`Friend ${i+1}`} {member.handle?`@${member.handle}`:''} · {member.sun_sign||'sun sign private'} · {today?'consulted today':member.consulted_on?`consulted ${member.consulted_on}`:'quiet for now'}</Txt>{member.theme?<Txt style={styles.caption}>{skyPrompts[member.theme]?.label||'Growth'}</Txt>:null}{!mine?<>{owner?<><Action label={`Remove ${member.display_name||`Friend ${i+1}`}`} quiet disabled={busy} onPress={()=>void act(()=>manageCircle(circle.id,member.user_id,'remove'))}/><Action label={`Transfer ownership to ${member.display_name||`Friend ${i+1}`}`} quiet disabled={busy} onPress={()=>void act(()=>manageCircle(circle.id,member.user_id,'transfer'))}/></>:null}<Action label={`Ask about Friend ${i+1}`} quiet disabled={busy||!member.can_ask} onPress={()=>{if(!state.plus){onPlus();return;}setFirstName('');setFriendEntry({circle:circle.id,member:member.user_id})}}/>{!member.can_ask?<Txt style={styles.caption}>Friend readings are off for this person.</Txt>:null}<Action label={`Block Friend ${i+1}`} quiet disabled={busy} onPress={()=>void act(()=>blockMember(member.user_id),'This person is blocked.')}/></>:null}<View><Txt style={styles.caption}>{reactions.map(r=>r.emoji).join(' ')} · {reactions.length} reactions</Txt>{!mine?<View style={[styles.row,{flexWrap:'wrap'}]}>{['❤️','🌙','✨'].map(emoji=><Action key={emoji} label={`${emoji} for Friend ${i+1}`} quiet disabled={busy} onPress={()=>void act(()=>reactInCircle(circle.id,member.user_id,emoji))}/>)}</View>:null}{today?<><Txt style={styles.caption}>Stars of encouragement</Txt>{!mine?<Action label={`Send a star to Friend ${i+1}`} quiet disabled={busy||reactions.some(r=>r.user_id===data.owner)} onPress={()=>void act(()=>reactInCircle(circle.id,member.user_id),'A little encouragement sent.')}/>:null}</>:null}</View></View>;
    })}{data.moments.filter(m=>m.circle_id===circle.id).map(moment=><Txt key={moment.id} style={styles.caption}>{data.members.find(m=>m.user_id===moment.user_id)?.display_name||'A member'} · {moment.day} · {moment.kind==='golden'?'Golden draw':moment.kind==='yes'?'Came true':'Not quite yet'}</Txt>)}<CircleForecasts circle={circle.id} data={data} act={act} busy={busy} aiConsent={aiConsent} onPlus={onPlus}/>{owner?<Action label="Invite a friend" quiet disabled={busy} onPress={()=>void act(async()=>{const token=await inviteToCircle(circle.id);setLink(Linking.createURL('/',{queryParams:{circle:token}}))})}/>:null}<Action label="Leave this circle" quiet onPress={()=>setConfirmLeave(circle.id)}/>{confirmLeave===circle.id?<><Txt style={styles.caption}>{owner?'Leave? Ownership passes to the earliest remaining member.':'Stop sharing your activity with this circle?'}</Txt><Action label="Yes, leave the circle" disabled={busy} onPress={()=>void act(async()=>{await leaveCircle(circle.id);setConfirmLeave('')},'Circle left.')}/><Action label="Keep my place" quiet onPress={()=>setConfirmLeave('')}/></>:null}</Surface></View>;
   })}
   <View style={styles.panel}><Surface kind="card"><View style={styles.row}><Txt style={{flexShrink:1}}>Friends can ask about me</Txt><Toggle accessibilityLabel="Friends can ask about me" disabled={busy||data?.profile?.age_band!=='adult'} value={data?.profile?.friends_can_ask===true} onValueChange={allowed=>void act(()=>setFriendConsent(allowed))}/></View><Txt style={styles.caption}>{data?.profile?.age_band==='adult'?'Uses only your sun sign and shared themes.':'Off for teens and unknown ages.'}</Txt></Surface></View>
   {data?.notices?<View style={styles.panel}><Surface kind="card"><Txt>Someone asked about you.</Txt><Txt style={styles.caption}>Their question and forecast stay private.</Txt><Action label="Got it" quiet onPress={()=>void act(()=>dismissFriendNotices())}/></Surface></View>:null}
   {friendEntry?<View style={styles.panel}><Surface kind="card"><Txt>What is this friend’s first name?</Txt><Field accessibilityLabel="Friend’s first name" value={firstName} onChangeText={setFirstName} maxLength={40} style={styles.input}/><Action label="Ask about this friend" disabled={busy||!validFirstName(firstName.trim())||!data?.members.some(m=>m.circle_id===friendEntry.circle&&m.user_id===friendEntry.member&&m.can_ask)} onPress={()=>{const name=firstName.trim();if(!validFirstName(name))return;if(!state.plus){onPlus();return;}onAsk(`What lies ahead for ${name}?`,true,{...friendEntry,firstName:name})}}/><Txt style={styles.caption}>Only their sun sign and shared themes inform the reading. They are told someone asked, never what.</Txt></Surface></View>:null}
   {data?.receivedSeals.map(card=><SealedCard key={card.token} token={card.token} reduce={reduce}/>)}
   {data?.seals.map(card=><View key={card.id} style={styles.panel}><Surface kind="card"><Txt>{card.opened_at?'Opened':'Sealed'} · {card.headline}</Txt><Action label="Show sealed link" quiet onPress={()=>{try{setLink(sealedLink(card.token))}catch(error){setNotice(error instanceof Error?error.message:'The card could not be shared.')}}}/><Action label="Revoke this card" quiet disabled={busy} onPress={()=>void act(()=>revokeSeal(card.id),'Card revoked.')}/></Surface></View>)}
  </>}
  </Enter>:null}
  {link?<LinkCard url={link} onClose={()=>setLink('')}/>:null}
  {notice?<View style={styles.panel}><Surface kind="card"><Txt accessibilityLiveRegion="polite">{notice}</Txt><Action label="Dismiss social notice" quiet onPress={()=>setNotice('')}/></Surface></View>:null}
  {offline?<View style={styles.panel}><Surface kind="error"><Txt style={styles.caption}>{socialUnavailable}</Txt><Action label="Try connecting again" quiet disabled={busy} onPress={()=>setVersion(v=>v+1)}/></Surface></View>:null}
 </>;
}
