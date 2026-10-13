import {View} from 'react-native';
import {CardHeader,RowLink,styles,Txt} from './ui';
import {useStore} from './store';
import {skyPrompts} from './social-policy';
import {yearRecap} from './recap';
import {Surface} from './Surface';

const plural=(n:number,word:string)=>`${n} ${word}${n===1?'':'s'}`;
export function YearRecap({onPlus}:{onPlus:()=>void}){
 const {state}=useStore(),currentYear=new Date().getFullYear();
 const years=[currentYear,...[...new Set(state.history.map(p=>new Date(p.createdAt).getFullYear()))].filter(year=>year<currentYear).sort((a,b)=>b-a)];
 return <View testID="year-recap">{years.map(year=>{const recap=yearRecap(state.history,year);return <View key={year} testID={`year-recap-${year}`} style={styles.panel}><Surface kind="card"><CardHeader title={`Your ${recap.year} in forecasts`} label="Year in review"/>{state.plus?<View style={{marginTop:10}}>
  <Txt>{plural(recap.readings,'reading')} · {plural(recap.golden,'golden find')} · {plural(recap.yes,'Yes check-in')}</Txt>
  {recap.themes.length?<Txt style={styles.caption}>Most asked: {recap.themes.map(t=>`${skyPrompts[t.theme].label} ${t.count}`).join(' · ')}</Txt>:null}
 </View>:<View style={{marginTop:14}}>
  <RowLink testID={year===currentYear?'year-recap-plus':`year-recap-plus-${year}`} label="Open my year" detail="Plus" accessibilityLabel="See my year with Plus" onPress={onPlus}/>
 </View>}</Surface></View>})}</View>;
}
