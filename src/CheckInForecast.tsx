import {shareCircleMoment} from './social';
import {useState} from 'react';
import {Pressable,View} from 'react-native';
import {Action,RadioGroup,colors,styles,Txt} from './ui';
import {useStore} from './store';
import {checkInLabel,formatCalendarDate,suggestedCheckIn} from './retention';
import type {Prediction} from './types';

export function CheckInForecast({prediction}:{prediction:Prediction}){
 const {update}=useStore();
 const [open,setOpen]=useState(false),[outcome,setOutcome]=useState(prediction.outcome);
 return <View>
  <Txt style={[styles.caption,{color:colors.gold}]}>Check-in</Txt>
  <Txt accessibilityRole="header" display style={{fontSize:22,lineHeight:28,marginTop:12}}>What happened?</Txt>
  <Txt style={{fontSize:16,lineHeight:24,marginTop:12}}>{prediction.question}</Txt>
  <RadioGroup testID="outcome-options" accessibilityLabel="What happened?" style={{marginTop:12}}>{(['yes','no','pending'] as const).map((value,index)=><Pressable testID={`check-in-${value}`} key={value} accessibilityRole="radio" tabIndex={outcome===value||!outcome&&index===0?0:-1} aria-checked={outcome===value} accessibilityState={{checked:outcome===value}} onPress={()=>setOutcome(value)} style={{minHeight:56,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:14,borderBottomWidth:1,borderColor:'#614C3466'}}><View aria-hidden style={{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:outcome===value?colors.gold:colors.muted,alignItems:'center',justifyContent:'center'}}>{outcome===value?<View style={{width:10,height:10,borderRadius:5,backgroundColor:colors.gold}}/>:null}</View><Txt style={{flex:1,color:outcome===value?colors.gold:colors.ice}}>{value==='yes'?'Yes':value==='no'?'Not quite':'Not yet'}</Txt></Pressable>)}</RadioGroup>
  <Action testID="save-outcome" label="Save outcome" disabled={!outcome||outcome===prediction.outcome} onPress={()=>{if(outcome){void shareCircleMoment(prediction.id,outcome).catch(()=>{});update(state=>({...state,history:state.history.map(reading=>reading.id===prediction.id?{...reading,outcome}:reading)}))}}}/>
  <Txt testID="check-in-status" accessibilityLiveRegion="polite" style={[styles.caption,{color:colors.gold,marginTop:12}]}>{prediction.outcome?`Saved · ${checkInLabel(prediction)}`:''}</Txt>
  <Txt testID="check-in-guidance" style={[styles.caption,{marginTop:8}]}>{outcome!==prediction.outcome?'Not saved yet. Save your outcome.':prediction.outcome?'Choose again to change your answer, then save.':'Choose an outcome, then save.'}</Txt>
  <Pressable testID="check-in-forecast" accessibilityRole="button" accessibilityState={{expanded:open}} aria-expanded={open} onPress={()=>setOpen(!open)} style={{minHeight:48,paddingVertical:12,borderBottomWidth:1,borderColor:'#614C3466'}}><Txt style={{color:colors.ice}}>Read the forecast {open?'⌃':'⌄'}</Txt></Pressable>
  {open?<View testID="check-in-forecast-content"><Txt display style={{fontSize:22,lineHeight:28,marginTop:12}}>{prediction.headline}</Txt><Txt style={[styles.caption,{color:colors.gold,marginTop:12}]}>{prediction.label}</Txt></View>:null}
  <Txt testID="forecast-due-date" style={[styles.caption,{marginTop:12}]}>Check-in reminder · {formatCalendarDate(suggestedCheckIn(prediction))}</Txt>
 </View>;
}
