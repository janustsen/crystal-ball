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
 const quiet=!recap.readings&&!recap.whispers&&!recap.checkIns;
 return <View testID="week-recap" style={styles.panel}><Surface kind="card">
  <CardHeader title="Your week in the Ball" label="Last 7 days"/>
  {quiet?<Txt style={[styles.muted,{marginTop:10}]}>A quiet week. The Ball keeps a whisper for you each day.</Txt>:<>
   <Txt style={{marginTop:10}}>{plural(recap.landed,'whisper')} landed · {recap.whispers} checked</Txt>
   <Txt>{plural(recap.readings,'reading')} · {plural(recap.checkIns,'check-in')} · {plural(recap.golden,'golden find')}</Txt>
   {recap.theme?<Txt style={styles.caption}>Most on your mind: {skyPrompts[recap.theme].label}</Txt>:null}
  </>}
  <Txt style={[styles.label,{marginTop:16}]}>For next week</Txt>
  <Txt display style={{fontSize:22,lineHeight:27,marginTop:6}}>{recap.suggestion}</Txt>
  <Action testID="week-recap-ask" label="Ask this" quiet onPress={()=>onAsk(recap.suggestion)}/>
  <Txt style={styles.caption}>Counts only · no accuracy score.</Txt>
 </Surface></View>;
}
