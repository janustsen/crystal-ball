import {useEffect,useState} from 'react';
import {AppState,View} from 'react-native';
import {Action,CardHeader,Txt,colors,styles} from './ui';
import {useStore} from './store';
import {skyPrompts} from './social-policy';
import {identity,weekRecap} from './recap';
import {Surface} from './Surface';
import {localDay,watchLocalDay} from './retention';

const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
// "Your week in the Ball": free, counts only, the seven days ending today.
export function WeekRecap({onAsk,onShare}:{onAsk:(question:string)=>void;onShare:()=>void}){
 // The window follows the local day even while History stays open across midnight.
 const {state}=useStore(),[today,setToday]=useState(localDay),recap=weekRecap(state.history,state.whispers,today,state.ageBand==='teen');
 useEffect(()=>watchLocalDay(setToday,AppState),[]);
 // Only non-zero counts: the recap celebrates what happened and never lists misses.
 const counts=[recap.landed?`${plural(recap.landed,'whisper')} landed`:'',[recap.readings&&plural(recap.readings,'reading'),recap.golden&&plural(recap.golden,'golden find')].filter(Boolean).join(' · ')].filter(Boolean);
 return <View testID="week-recap" style={styles.panel}><Surface kind="card">
  <CardHeader title="Your week in the Ball" label="Last 7 days"/>
  {counts.length?<View style={{marginTop:10}}><Txt testID="week-recap-identity" style={[styles.strong,{color:colors.gold,marginBottom:6}]}>{identity(recap.theme)}</Txt>{counts.map(line=><Txt key={line}>{line}</Txt>)}{recap.theme?<Txt style={styles.caption}>Most on your mind: {skyPrompts[recap.theme].label}</Txt>:null}<Action testID="week-recap-share" label="Share my week" quiet onPress={onShare}/></View>:<Txt style={[styles.muted,{marginTop:10}]}>A quiet week. The Ball keeps a whisper for you each day.</Txt>}
  <Txt style={[styles.label,{marginTop:16}]}>For next week</Txt>
  <Txt style={[styles.strong,{marginTop:6}]}>{recap.suggestion}</Txt>
  <Action testID="week-recap-ask" label="Ask this" quiet onPress={()=>onAsk(recap.suggestion)}/>
 </Surface></View>;
}
