import {useState} from 'react';
import {Pressable,View} from 'react-native';
import {colors,styles,Txt} from './ui';
import type {Prediction} from './types';

export function CheckInForecast({prediction}:{prediction:Prediction}){
 const [open,setOpen]=useState(false);
 return <View>
  <Txt style={[styles.caption,{color:colors.gold}]}>Check-in</Txt>
  <Txt style={{fontSize:16,lineHeight:24,marginTop:12}}>{prediction.question}</Txt>
  <Pressable testID="check-in-forecast" accessibilityRole="button" accessibilityState={{expanded:open}} aria-expanded={open} onPress={()=>setOpen(!open)} style={{minHeight:48,paddingVertical:12,borderBottomWidth:1,borderColor:'#614C3466'}}><Txt style={{color:colors.ice}}>Read the forecast {open?'⌃':'⌄'}</Txt></Pressable>
  {open?<View testID="check-in-forecast-content"><Txt display style={{fontSize:22,lineHeight:28,marginTop:12}}>{prediction.headline}</Txt><Txt style={[styles.caption,{color:colors.gold,marginTop:12}]}>{prediction.label}</Txt></View>:null}
 </View>;
}
