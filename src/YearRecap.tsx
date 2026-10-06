import {View} from 'react-native';
import {Action,styles,Txt} from './ui';
import {useStore} from './store';
import {skyPrompts} from './social-policy';
import {yearRecap} from './recap';

const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
export function YearRecap({onPlus}:{onPlus:()=>void}){
 const {state}=useStore(),recap=yearRecap(state.history,new Date().getFullYear());
 if(!recap.readings)return null;
 return <View testID="year-recap" style={styles.panel}><Txt display style={styles.title}>Your {recap.year} in forecasts</Txt>{state.plus?<>
  <Txt>{plural(recap.readings,'reading')} · {plural(recap.golden,'golden find')} · {plural(recap.yes,'Yes check-in')}</Txt>
  {recap.themes.length?<Txt style={styles.caption}>Most asked: {recap.themes.map(t=>`${skyPrompts[t.theme].label} ${t.count}`).join(' · ')}</Txt>:null}
  <Txt style={styles.caption}>Counts only · no accuracy score.</Txt>
 </>:<>
  <Txt style={styles.caption}>Your readings, themes, golden finds and Yes check-ins this year.</Txt>
  <Action testID="year-recap-plus" label="See my year with Plus" quiet onPress={onPlus}/>
 </>}</View>;
}
