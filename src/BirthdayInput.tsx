import {useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {Input,Txt,styles,colors} from './ui';
import {birthdayFromParts} from './profile';
import {useStore} from './store';
export function BirthdayInput({value,onChange,testID}:{value:string;onChange:(value:string)=>void;testID?:string}){
 const {state}=useStore();
 const parts=(text:string)=>{const [year='',month='',day='']=text.split('-');return {year,month,day}};
 const [draft,setDraft]=useState(()=>parts(value)),emitted=useRef(value);
 useEffect(()=>{if(value!==emitted.current){setDraft(parts(value));emitted.current=value}},[value]);
 function change(key:'year'|'month'|'day',text:string){const next={...draft,[key]:text.replace(/\D/g,'')};setDraft(next);const date=birthdayFromParts(next.year,next.month,next.day);emitted.current=date;onChange(date)}
 return <View testID={testID}>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{(['day','month','year'] as const).map(key=><View key={key} style={{flex:state.largeText?undefined:key==='year'?1.4:1,...state.largeText?{width:key==='year'?'100%':'47%'}:{}}}><Txt style={styles.caption}>{key[0].toUpperCase()+key.slice(1)}</Txt><Input accessibilityLabel={`Birthday ${key}`} keyboardType="number-pad" inputMode="numeric" value={draft[key]} onChangeText={text=>change(key,text)} maxLength={key==='year'?4:2} placeholder={key==='year'?'YYYY':key==='month'?'MM':'DD'} placeholderTextColor={colors.muted} style={styles.input}/></View>)}</View>
  <Txt style={[styles.caption,{marginTop:8}]}>For example: day 15, month 6, year 1995.</Txt>
 </View>;
}
