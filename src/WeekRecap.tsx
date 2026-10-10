import {View} from 'react-native';
import {Action,CardHeader,Txt,styles} from './ui';
import {useStore} from './store';
import {skyPrompts} from './social-policy';
import {weekRecap} from './recap';
import {Surface} from './Surface';

const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
// "Your week in the Ball": free, counts only, the seven days ending today.
export function WeekRecap({onAsk}:{onAsk:(question:string)=>void}){
 const {state}=useStore(),recap=weekRecap(state.history,state.whispers,undefined,state.ageBand==='teen');
 // Only non-zero counts: the recap celebrates what happened and never lists misses.
 const counts=[recap.whispers?`${plural(recap.whispers,'whisper')} checked${recap.landed?` · ${recap.landed} landed`:''}`:'',[recap.readings&&plural(recap.readings,'reading'),recap.checkIns&&plural(recap.checkIns,'check-in'),recap.golden&&plural(recap.golden,'golden find')].filter(Boolean).join(' · ')].filter(Boolean);
 return <View testID="week-recap" style={styles.panel}><Surface kind="card">
  <CardHeader title="Your week in the Ball" label="Last 7 days"/>
  {counts.length?<View style={{marginTop:10}}>{counts.map(line=><Txt key={line}>{line}</Txt>)}{recap.theme?<Txt style={styles.caption}>Most on your mind: {skyPrompts[recap.theme].label}</Txt>:null}</View>:<Txt style={[styles.muted,{marginTop:10}]}>A quiet week. The Ball keeps a whisper for you each day.</Txt>}
  <Txt style={[styles.label,{marginTop:16}]}>For next week</Txt>
  <Txt display style={{fontSize:22,lineHeight:27,marginTop:6}}>{recap.suggestion}</Txt>
  <Action testID="week-recap-ask" label="Ask this" quiet onPress={()=>onAsk(recap.suggestion)}/>
  <Txt style={styles.caption}>Counts only · no accuracy score.</Txt>
 </Surface></View>;
}
