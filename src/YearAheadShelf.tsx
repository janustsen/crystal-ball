import {useEffect,useState} from 'react';
import {Pressable,View} from 'react-native';
import {Action,CardHeader,Txt,colors,styles} from './ui';
import {OrbVisual} from './OrbVisual';
import {Surface} from './Surface';
import {useStore} from './store';
import {aiProvider,requestYearAhead,serverMetered,simulatePurchase} from './api';
import {purchaseMode} from './purchases';
import {yearAheadProduct} from './billing';
import {saveReading} from './reading-history';
import {localDay} from './retention';
import {uuid} from './uuid';
import {monthName,monthsFrom,openedReading,shelf,type ShelfBall} from './year-ahead';
import type {Prediction} from './types';

// One sealing at a time, even when the shelf unmounts and remounts while the twelve months are being written.
let sealing:Promise<void>|null=null;
// Twelve small balls on the Inner Library's shelf. Sealed balls stay dim until the 1st of their month.
export function YearAheadShelf({onOpen}:{onOpen:(p:Prediction)=>void}){
 const {state,update,applyBalance,saveAskProgress,backupBusy}=useStore(),[busy,setBusy]=useState(()=>!!sealing),[notice,setNotice]=useState('');
 useEffect(()=>{let live=true;void sealing?.finally(()=>{if(live)setBusy(false)});return()=>{live=false}},[]);
 const year=state.yearAhead,today=localDay(),aiBlocked=!!aiProvider&&state.aiConsent!==aiProvider;
 const onSale=purchaseMode==='mock';
 const balls:ShelfBall[]=year?.kind==='sealed'?shelf(year,state.history,today):monthsFrom(today).map(month=>({month,id:month,headline:'',state:'sealed'}));
 function seal(buy=false){
  if(sealing)return;
  setBusy(true);setNotice('');
  sealing=(async()=>{try{
   if(buy){
    if(serverMetered)await applyBalance(await simulatePurchase('yearAhead'));
    else update(s=>s.yearAhead?s:{...s,yearAhead:{kind:'owned',source:'purchase'}});
   }
   const months=await requestYearAhead(state.facts,state,aiBlocked?'':aiProvider);
   await saveAskProgress(s=>{
    if(s.yearAhead?.kind!=='owned')throw new Error('Your year ahead changed. Please try again.');
    return {...s,yearAhead:{kind:'sealed',source:s.yearAhead.source,sealedAt:new Date().toISOString(),months:months.map(m=>({...m,id:uuid()}))}};
   });
   setNotice(`Your twelve months are sealed. ${monthName(months[0].month)} is open now.`);
  }catch(error){setNotice(error instanceof Error?error.message:'The Ball could not seal your year. Please try again.')}})().finally(()=>{sealing=null;setBusy(false)});
 }
 function open(ball:ShelfBall){
  if(year?.kind!=='sealed')return;
  if(ball.state==='sealed'){setNotice(`This ball opens on ${monthName(ball.month)} 1.`);return}
  const reading=state.history.find(p=>p.id===ball.id)??openedReading(year,ball);
  if(ball.state==='ready')update(s=>saveReading(s,reading,undefined,false));
  onOpen(reading);
 }
 const sealed=year?.kind==='sealed';
 return <View testID="year-ahead" style={styles.panel}><Surface kind="card">
  <CardHeader title="Your year ahead" label={sealed?`Sealed ${new Date(year.sealedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`:'Year ahead'}/>
  <View aria-hidden={!sealed} accessibilityElementsHidden={!sealed} importantForAccessibility={sealed?'auto':'no-hide-descendants'} style={{flexDirection:'row',flexWrap:'wrap',marginTop:12}}>{balls.map(ball=>
   <Pressable key={ball.month} testID={`year-ahead-${ball.month}`} disabled={!sealed||backupBusy} accessibilityRole="button" accessibilityLabel={`${monthName(ball.month)}, ${ball.state==='sealed'?`sealed until ${monthName(ball.month)} 1`:ball.state==='ready'?'ready to open':'opened'}`} onPress={()=>open(ball)} style={{width:'25%',alignItems:'center',paddingVertical:6,minHeight:44}}>
    <View style={{padding:3,borderRadius:999,borderWidth:1.5,borderColor:sealed&&ball.state==='ready'?colors.gold:'transparent',opacity:ball.state==='sealed'?.38:1}}><OrbVisual size={36} reduce/></View>
    <Txt style={[styles.caption,{textAlign:'center'},sealed&&ball.state==='ready'?{color:colors.gold}:null]}>{monthName(ball.month,'short')}</Txt>
   </Pressable>)}</View>
  {sealed?<Txt style={[styles.caption,{marginTop:8}]}>Each ball opens on the 1st of its month. Check in on it when the next one opens.</Txt>
  :year&&onSale?<View style={{marginTop:8}}>
   <Txt>{year.source==='yearly'?'Included with your Yearly plan.':'Your year ahead is paid for.'} The Ball writes all twelve months at once, then seals them.</Txt>
   <Action testID="year-ahead-seal" label={busy?'Sealing your year…':'Seal my year'} disabled={busy||backupBusy||aiBlocked} onPress={()=>seal()}/>
  </View>
  :<View style={{marginTop:8}}>
   <Txt>Twelve sealed forecasts, one for each month ahead. This month’s opens at once; each later ball opens on the 1st of its month.</Txt>
   {onSale?<><Action testID="year-ahead-buy" label={`Seal my year · ${yearAheadProduct.price} · simulate`} disabled={busy||backupBusy||aiBlocked} onPress={()=>seal(true)}/><Txt style={[styles.caption,{marginTop:8}]}>One-time purchase, included with Yearly Plus. Test mode · no real payment.</Txt></>
   :<Txt style={[styles.caption,{marginTop:8}]}>Coming soon to the App Store.</Txt>}
  </View>}
  {aiBlocked&&!sealed?<Txt style={[styles.caption,{marginTop:8}]}>Allow AI processing in Ask first.</Txt>:null}
  {busy?<Txt style={[styles.caption,{marginTop:8}]}>The Ball is writing twelve months. This can take a minute.</Txt>:null}
  {notice?<Txt testID="year-ahead-notice" accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:8}]}>{notice}</Txt>:null}
 </Surface></View>;
}
