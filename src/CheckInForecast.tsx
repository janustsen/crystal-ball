import {shareCircleMoment} from './social';
import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Platform,Pressable,View,useWindowDimensions} from 'react-native';
import {Action,Paper,RadioGroup,colors,styles,Txt} from './ui';
import {useStore} from './store';
import {checkInLabel,formatCalendarDate,suggestedCheckIn} from './retention';
import type {Prediction} from './types';

export function CheckInForecast({prediction}:{prediction:Prediction}){
 const {state,update}=useStore(),{fontScale}=useWindowDimensions(),stacked=state.largeText||fontScale>1.3;
 const [open,setOpen]=useState(false),[outcome,setOutcome]=useState(prediction.outcome),[editing,setEditing]=useState(!prediction.outcome);
 const dirty=outcome!==prediction.outcome,changeRef=useRef<View>(null),optionRef=useRef<View>(null),focusPending=useRef(false);
 useEffect(()=>{
  if(!focusPending.current)return;focusPending.current=false;
  const target=editing?optionRef.current:changeRef.current;if(!target)return;
  if(Platform.OS==='web')(target as unknown as HTMLElement).focus();
  else AccessibilityInfo.sendAccessibilityEvent(target,'focus');
 },[editing]);
 function edit(){setOutcome(prediction.outcome);focusPending.current=true;setEditing(true)}
 function cancel(){setOutcome(prediction.outcome);focusPending.current=true;setEditing(false)}
 function save(){if(!outcome)return;void shareCircleMoment(prediction.id,outcome).catch(()=>{});update(current=>({...current,history:current.history.map(reading=>reading.id===prediction.id?{...reading,outcome}:reading)}));focusPending.current=true;setEditing(false)}
 return <View>
  <Txt accessibilityRole="header" display style={{fontSize:20,lineHeight:26}}>{editing?'What happened?':'Your check-in'}</Txt>
  <Paper style={{marginHorizontal:-8,marginTop:12}}><Txt testID="check-in-forecast-content" display={!stacked} style={stacked?{fontSize:17,lineHeight:24,fontStyle:'italic'}:{fontSize:18,lineHeight:25}}>{prediction.headline}</Txt><Txt style={[styles.caption,{marginTop:8}]}>{prediction.label}</Txt>
  {editing?<RadioGroup testID="outcome-options" accessibilityLabel="What happened?" style={{marginTop:12,flexDirection:stacked?'column':'row',gap:8}}>{(['yes','no','pending'] as const).map((value,index)=><Pressable ref={outcome===value||!outcome&&index===0?optionRef:undefined} accessible testID={`check-in-${value}`} key={value} accessibilityRole="radio" tabIndex={outcome===value||!outcome&&index===0?0:-1} aria-checked={outcome===value} accessibilityState={{checked:outcome===value}} onPress={()=>setOutcome(value)} style={({pressed})=>({flex:stacked?undefined:1,minWidth:0,minHeight:stacked?52:72,paddingVertical:10,flexDirection:stacked?'row':'column',alignItems:'center',gap:stacked?10:6,justifyContent:'center',marginTop:4,opacity:pressed?.65:1})}><View aria-hidden style={{width:22,height:22,borderRadius:11,borderWidth:2,borderColor:'#74502b',alignItems:'center',justifyContent:'center'}}>{outcome===value?<View style={{width:10,height:10,borderRadius:5,backgroundColor:'#74502b'}}/>:null}</View><Txt style={{fontWeight:outcome===value?'700':'400'}}>{value==='yes'?'Yes':value==='no'?'Not quite':'Not yet'}</Txt></Pressable>)}</RadioGroup>:null}
  <Txt testID="check-in-status" accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:16}]}>{!editing?`Saved · ${checkInLabel(prediction)}`:dirty?'Not saved yet.':'Choose an outcome, then save.'}</Txt>
  </Paper>
  {editing?<><Action testID="save-outcome" label="Save outcome" disabled={!outcome||!dirty} onPress={save}/>{prediction.outcome?<Action testID="cancel-outcome" label="Cancel changes" quiet onPress={cancel}/>:null}</>:<Pressable ref={changeRef} accessible testID="change-outcome" accessibilityRole="button" onPress={edit} style={{minHeight:48,justifyContent:'center',paddingVertical:12}}><Txt style={{color:colors.ice}}>Change outcome</Txt></Pressable>}
  <Pressable testID="check-in-forecast" accessibilityRole="button" accessibilityState={{expanded:open}} aria-expanded={open} onPress={()=>setOpen(!open)} style={{minHeight:48,paddingVertical:12}}><Txt style={{color:colors.ice}}>Original question {open?'⌃':'⌄'}</Txt></Pressable>
  {open?<Paper testID="check-in-question"><Txt>{prediction.question}</Txt></Paper>:null}
  <Txt testID="forecast-due-date" style={[styles.caption,{marginTop:12}]}>Suggested check-in · {formatCalendarDate(suggestedCheckIn(prediction))}</Txt>
 </View>;
}
