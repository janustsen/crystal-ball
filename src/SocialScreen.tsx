import React,{useEffect,useState} from 'react';
import {Pressable,Share,Switch,View} from 'react-native';
import * as Linking from 'expo-linking';
import {Action,colors,Orb,styles,Txt} from './ui';
import {useStore} from './store';
import type {Prediction} from './types';
import {sampleStars,skyPrompts,socialUnavailable,type SkyPrompt} from './social-policy';
import {blockMember,blockStarAuthor,createCircle,dismissFriendNotices,inviteToCircle,joinCircle,leaveCircle,loadSocial,openForecast,prepareSocialDraft,publishStar,reactInCircle,removeStar,reportStar,resonate,revokeSeal,sealForecast,setFriendConsent,type FriendTarget,type SocialDraft,type SocialSnapshot} from './social';

function LinkCard({url,onClose}:{url:string;onClose:()=>void}){
 const [notice,setNotice]=useState('');
 return <View style={styles.panel}><Txt>For someone you trust</Txt><Txt style={styles.caption}>One person · expires in 7 days</Txt><Txt selectable testID="social-link" style={[styles.caption,{marginTop:12,color:colors.ice}]}>{url}</Txt><Action label="Share private link" onPress={()=>void Share.share({message:url,url}).catch(()=>setNotice('Sharing was canceled. You can copy the link above.'))}/>{notice?<Txt accessibilityLiveRegion="polite">{notice}</Txt>:null}<Action label="Close link" quiet onPress={onClose}/></View>;
}

export function SealForecast({prediction}:{prediction:Prediction}){
 const {state}=useStore();
 const [draft,setDraft]=useState<SocialDraft|null>(null),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 if(!prediction.friend)return null;
 async function prepare(){setBusy(true);setNotice('');try{setDraft(await prepareSocialDraft('seal',prediction.headline))}catch(error){setNotice(error instanceof Error?error.message:'This forecast could not be sealed.')}finally{setBusy(false)}}
 return <View style={{marginTop:12}}><Action label={busy?'Checking the wording…':'Seal for a friend'} quiet disabled={busy} onPress={()=>void prepare()}/>{draft?<View style={styles.panel}><Txt display style={styles.title}>A glimpse, just for them.</Txt><Txt>{draft.wording}</Txt><Txt style={[styles.caption,{marginTop:12}]}>Only this headline is sent. Your question and answers stay private.</Txt><Txt style={styles.caption}>{state.plus?'Plus · unlimited seals':'One free sealed forecast per week'}</Txt><Action label="Create sealed link" disabled={busy||!!url} onPress={()=>{setBusy(true);setNotice('');void sealForecast(draft).then(token=>setUrl(Linking.createURL('/',{queryParams:{seal:token}}))).catch(error=>setNotice(error instanceof Error?error.message:'The card could not be sealed.')).finally(()=>setBusy(false));}}/></View>:null}{notice?<Txt accessibilityLiveRegion="polite">{notice}</Txt>:null}{url?<LinkCard url={url} onClose={()=>setUrl('')}/>:null}</View>;
}

function SealedCard({token,reduce}:{token:string;reduce:boolean}){
 const [headline,setHeadline]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{setHeadline('');setNotice('')},[token]);
 async function open(){setBusy(true);setNotice('');try{setHeadline(await openForecast(token))}catch(error){setNotice(error instanceof Error?error.message:'This seal is unavailable.')}finally{setBusy(false)}}
 return <View style={styles.panel}><Txt display style={styles.title}>{headline?'A glimpse for you.':'Someone sealed a glimpse for you.'}</Txt><Pressable testID="open-sealed-forecast" accessibilityRole="button" accessibilityLabel="Open sealed forecast" disabled={busy||!!headline} onPress={()=>void open()} style={{alignItems:'center',minHeight:52}}><Orb size={170} reduce={reduce} phase={headline?'reveal':'idle'}/></Pressable>{headline?<><Txt display>{headline}</Txt><Txt style={[styles.caption,{marginTop:12,color:colors.gold}]}>Speculative forecast · not a guarantee</Txt></>:<Txt style={styles.caption}>{busy?'Opening…':'Tap the ball to open. Only you can claim this card.'}</Txt>}{notice?<Txt accessibilityLiveRegion="polite">{notice}</Txt>:null}</View>;
}

export function Social({onAsk,onPlus,invite,seal,reduce}:{onAsk:(question:string,friend?:boolean,target?:FriendTarget)=>void;onPlus:()=>void;invite?:string;seal?:string;reduce:boolean}){
 const {state}=useStore();
 const [section,setSection]=useState<'sky'|'circles'>(invite?'circles':'sky'),[selected,setSelected]=useState<SkyPrompt>('love');
 const [data,setData]=useState<SocialSnapshot|null>(null),[offline,setOffline]=useState(false),[version,setVersion]=useState(0),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[link,setLink]=useState(''),[draft,setDraft]=useState<SocialDraft|null>(null),[joining,setJoining]=useState(!!invite),[confirmLeave,setConfirmLeave]=useState('');
 useEffect(()=>{if(invite){setSection('circles');setJoining(true)}},[invite]);
 useEffect(()=>{
  let active=true;
  async function refresh(){try{const snapshot=await loadSocial();if(active){setData(snapshot);setOffline(false)}}catch{if(active){setData(null);setOffline(true)}}}
  void refresh();const timer=setInterval(()=>void refresh(),30000);
  return()=>{active=false;clearInterval(timer)};
 },[version]);
 async function act(operation:()=>Promise<unknown>,message=''){
  if(busy)return;setBusy(true);setNotice('');
  try{await operation();setVersion(v=>v+1);setNotice(message)}catch(error){setNotice(error instanceof Error?error.message:'The sky could not be reached. Try again.')}finally{setBusy(false)}
 }
 const stars=data?.stars??[],themeStars=stars.filter(star=>star.theme===selected),ownStar=data?.ownStar;
 const templates=Object.entries(skyPrompts) as [SkyPrompt,(typeof skyPrompts)[SkyPrompt]][];
 return <>
  <View style={[styles.row,{flexWrap:'wrap',marginBottom:20}]}>{(['sky','circles'] as const).map(part=><Pressable key={part} testID={`social-section-${part}`} accessibilityRole="button" accessibilityState={{selected:section===part}} onPress={()=>{setSection(part);setNotice('')}} style={{minHeight:48,justifyContent:'center',borderBottomWidth:section===part?1:0,borderColor:colors.gold}}><Txt style={{color:section===part?colors.gold:colors.muted}}>{part==='sky'?'Tonight’s Sky':'Circles'}</Txt></Pressable>)}</View>
  {seal?<SealedCard token={seal} reduce={reduce}/>:null}
  {section==='sky'?<>
   <Txt display>A sky full of what-ifs.</Txt>
   <Txt style={[styles.caption,{marginTop:12}]}>{stars.length?`${stars.length} anonymous stars today · sample stars fill the quiet corners`:'Sample stars · a little inspiration until others arrive'}</Txt>
   <View testID="tonights-sky" style={{minHeight:state.largeText?0:380,marginVertical:20,borderRadius:22,backgroundColor:colors.surface,borderWidth:1,borderColor:'#614C34',padding:state.largeText?16:0}}>
    {templates.map(([key,prompt])=>{
     const live=stars.filter(star=>star.theme===key),points=live.length?live:sampleStars.filter(star=>star.theme===key);
     return <Pressable key={key} testID={`sky-theme-${key}`} accessibilityRole="button" accessibilityLabel={`${prompt.label}, ${live.length?`${live.length} anonymous stars`:'sample star'}`} accessibilityState={{selected:selected===key}} onPress={()=>{setSelected(key);setDraft(null)}} style={state.largeText?{padding:16,minHeight:60}:{position:'absolute',left:`${prompt.x-16}%`,top:`${prompt.y-12}%`,width:'34%',minHeight:80,alignItems:'center',justifyContent:'center'}}>
      <View accessible={false} style={{flexDirection:'row',gap:3,alignItems:'center'}}>{points.slice(0,5).map((point,index)=><Txt key={point.id} allowFontScaling={false} style={{fontSize:index?13:26,lineHeight:30,color:selected===key?colors.gold:colors.lavender,transform:[{translateY:index%2?5:-3}]}}>✦</Txt>)}</View>
      <Txt style={{color:selected===key?colors.gold:colors.ivory,fontSize:14}}>{prompt.label}</Txt>
     </Pressable>;
    })}
   </View>
   {!themeStars.length?<View style={styles.panel}><Txt style={styles.caption}>{skyPrompts[selected].label} · sample question</Txt><Txt display style={[styles.title,{marginTop:12}]}>{skyPrompts[selected].question}</Txt><Action label="Ask this too" onPress={()=>onAsk(skyPrompts[selected].question)}/></View>:null}
   {themeStars.map((star,index)=><View key={star.id} style={styles.panel}><Txt style={styles.caption}>{star.mine?'Your star':'Anonymous star'} · {star.resonances} resonance{star.resonances===1?'':'s'}</Txt><Txt display style={[styles.title,{marginTop:12}]}>{star.wording}</Txt><Action label={`Ask this too${index?` · ${index+1}`:''}`} onPress={()=>onAsk(star.wording)}/><Action label={star.resonated?'✦ Resonated':`✦ This resonates${index?` · ${index+1}`:''}`} quiet disabled={busy||star.resonated} onPress={()=>void act(()=>resonate(star.id))}/>{!star.mine?<View><Action label="Report this star" quiet disabled={busy} onPress={()=>void act(()=>reportStar(star.id),'Reported. Repeated reports hide a star automatically.')}/><Action label="Block this person" quiet disabled={busy} onPress={()=>void act(()=>blockStarAuthor(star.id),'This person is blocked. Their stars and activity are hidden.')}/></View>:null}</View>)}
   <Action label={busy?'The Ball is checking…':'Add my star'} quiet disabled={busy} onPress={()=>{const reading=state.history[0];if(!reading){onAsk('');return;}void act(async()=>{const next=await prepareSocialDraft('star',reading.question);setDraft(next);setSelected(next.theme)})}}/>
   {draft?<View style={styles.panel}><Txt>Approve your anonymous wording</Txt><Txt style={[styles.caption,{marginTop:8}]}>{draft.wording}</Txt><Txt style={[styles.caption,{marginTop:12}]}>Rewritten from your latest reading. No name, original question or answers. Visible today (UTC). One star per day.</Txt><Action label="Publish anonymous star" disabled={busy} onPress={()=>void act(async()=>{await publishStar(draft);setDraft(null)},'Your star is in tonight’s sky.')}/><Action label="Keep it private" quiet onPress={()=>setDraft(null)}/></View>:null}
   {ownStar?<Action label="Remove my star" quiet disabled={busy} onPress={()=>void act(()=>removeStar(ownStar),'Your star was removed.')}/>:null}
  </>:<>
   <Txt display>Your little circle.</Txt><Txt style={[styles.caption,{marginTop:12}]}>Friends by invitation. Their day, theme and sun sign. Never their question or forecast.</Txt>
   {joining&&invite?<View style={styles.panel}><Txt>A place in someone’s circle</Txt><Txt style={styles.caption}>Joining shares your future consultation days, themes and sun sign with up to 20 members. Leave whenever you like.</Txt><Action label="Join this circle" disabled={busy} onPress={()=>void act(async()=>{await joinCircle(invite);setJoining(false)},'You joined the circle.')}/><Action label="Decline invitation" quiet onPress={()=>setJoining(false)}/></View>:null}
   {!data?.circles.length?<View style={styles.panel}><Txt>A small sky of your own.</Txt><Txt style={styles.caption}>Create a circle, then invite someone you trust. Only the day, theme and sun sign are shared.</Txt><Action label="Create my circle" disabled={busy} onPress={()=>void act(()=>createCircle(),'Circle created. Invite your first friend.')}/></View>:null}
   {data?.circles.map((circle,index)=>{
    const owner=circle.owner_id===data.owner,members=data.members.filter(member=>member.circle_id===circle.id);
    return <View key={circle.id} style={styles.panel}><Txt display style={styles.title}>Circle {index+1}</Txt><Txt style={styles.caption}>{members.length} of 20 stars</Txt>{members.map((member,i)=>{
     const mine=member.user_id===data.owner,today=member.consulted_on===new Date().toISOString().slice(0,10),reactions=data.reactions.filter(r=>r.circle_id===circle.id&&r.target_id===member.user_id);
     return <View key={member.user_id} style={{marginTop:16}}><Txt>{mine?'You':`Friend ${i+1}`} · {member.sun_sign||'sun sign private'} · {today?'consulted today':member.consulted_on?`consulted ${member.consulted_on}`:'quiet for now'}</Txt>{member.theme?<Txt style={styles.caption}>{skyPrompts[member.theme]?.label||'Growth'}</Txt>:null}{!mine?<><Action label={`Ask about Friend ${i+1}`} quiet disabled={busy||!member.can_ask} onPress={()=>state.plus?onAsk('',true,{circle:circle.id,member:member.user_id}):onPlus()}/>{!member.can_ask?<Txt style={styles.caption}>Friend readings are off for this person.</Txt>:null}<Action label={`Block Friend ${i+1}`} quiet disabled={busy} onPress={()=>void act(()=>blockMember(member.user_id),'This person is blocked.')}/></>:null}{today?<><Txt style={styles.caption}>{reactions.length} stars of encouragement</Txt>{!mine?<Action label={`Send a star to Friend ${i+1}`} quiet disabled={busy||reactions.some(r=>r.user_id===data.owner)} onPress={()=>void act(()=>reactInCircle(circle.id,member.user_id),'A little encouragement sent.')}/>:null}</>:null}</View>;
    })}{owner?<Action label="Invite a friend" quiet disabled={busy} onPress={()=>void act(async()=>{const token=await inviteToCircle(circle.id);setLink(Linking.createURL('/',{queryParams:{circle:token}}))})}/>:null}<Action label={owner?'Close this circle':'Leave this circle'} quiet onPress={()=>setConfirmLeave(circle.id)}/>{confirmLeave===circle.id?<><Txt style={styles.caption}>{owner?'Close the circle for everyone?':'Stop sharing your activity with this circle?'}</Txt><Action label="Yes, leave the circle" disabled={busy} onPress={()=>void act(async()=>{await leaveCircle(circle.id);setConfirmLeave('')},'Circle left.')}/><Action label="Keep my place" quiet onPress={()=>setConfirmLeave('')}/></>:null}</View>;
   })}
   <View style={styles.panel}><Txt>Friends can ask about me</Txt><Switch accessibilityLabel="Friends can ask about me" disabled={busy||data?.profile?.age_band!=='adult'} value={data?.profile?.friends_can_ask===true} onValueChange={allowed=>void act(()=>setFriendConsent(allowed))}/><Txt style={styles.caption}>{data?.profile?.age_band==='adult'?'Off unless you choose. Only your sun sign and shared themes are used.':'Off for teens and unknown ages.'}</Txt></View>
   {data?.notices?<View style={styles.panel}><Txt>Someone asked about you.</Txt><Txt style={styles.caption}>Their question and forecast stay private.</Txt><Action label="Got it" quiet onPress={()=>void act(()=>dismissFriendNotices())}/></View>:null}
   <Action label="Read about someone" onPress={()=>onAsk('',true)}/><Txt style={[styles.caption,{marginTop:8}]}>First name only. The Ball knows nothing about them. No one is notified.</Txt>
   {data?.seals.map(card=><View key={card.id} style={styles.panel}><Txt>{card.opened_at?'Opened':'Sealed'} · {card.headline}</Txt><Action label="Show sealed link" quiet onPress={()=>setLink(Linking.createURL('/',{queryParams:{seal:card.token}}))}/><Action label="Revoke this card" quiet disabled={busy} onPress={()=>void act(()=>revokeSeal(card.id),'Card revoked.')}/></View>)}
  </>}
  {link?<LinkCard url={link} onClose={()=>setLink('')}/>:null}
  {notice?<View style={styles.panel}><Txt accessibilityLiveRegion="polite">{notice}</Txt><Action label="Dismiss social notice" quiet onPress={()=>setNotice('')}/></View>:null}
  {offline?<View style={{marginTop:20}}><Txt style={styles.caption}>{socialUnavailable}</Txt><Action label="Try connecting again" quiet disabled={busy} onPress={()=>setVersion(v=>v+1)}/></View>:null}
 </>;
}
