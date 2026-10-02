import {useEffect,useState} from 'react';
import {AccessibilityInfo,Linking,Platform,Pressable,View} from 'react-native';
import {Action,colors,styles,Txt} from './ui';
import {factLabels} from './questions';
import {useStore} from './store';
import type {Prediction} from './types';
export function WhyDetails({prediction,onClose,onUpgrade}:{prediction:Prediction;onClose:()=>void;onUpgrade:()=>void}){
 const {state}=useStore();
 const [open,setOpen]=useState<string[]>(['reason']);
 useEffect(()=>{if(Platform.OS==='web'){const heading=document.querySelector<HTMLElement>('[data-testid="why-heading"]');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});heading?.scrollIntoView({block:'start'});}else AccessibilityInfo.announceForAccessibility('Behind the mist')},[]);
 const groups=[
  {id:'reason',label:'Why this forecast',body:<Txt style={{lineHeight:25}}>{state.plus?(prediction.deeperWhy||prediction.why):prediction.why}</Txt>},
  {id:'answers',label:`Your answers · ${Object.keys(prediction.facts).length}`,body:Object.entries(prediction.facts).map(([key,value])=><View key={key} style={{marginBottom:12}}><Txt style={[styles.caption,{color:colors.gold}]}>{factLabels[key]||key.replaceAll('_',' ')}</Txt><Txt>{value}</Txt></View>)},
  {id:'assumptions',label:`Assumptions · ${prediction.assumptions.length}`,body:prediction.assumptions.map(assumption=><Txt key={assumption} style={{marginBottom:12,lineHeight:25}}>{assumption}</Txt>)},
  {id:'sources',label:`Current sources · ${prediction.sources.length||'none'}`,body:prediction.sources.length?prediction.sources.map(source=><Pressable key={source.url} accessibilityRole="link" onPress={()=>Linking.openURL(source.url)} style={{minHeight:48,paddingVertical:12}}><Txt style={{color:colors.ice}}>{source.title}</Txt><Txt style={styles.caption}>{new Date(source.date).toLocaleDateString()} · {source.publisher}</Txt></Pressable>):<Txt>No relevant current sources found.</Txt>}
 ];
 return <><Txt testID="why-heading" accessibilityRole="header" style={[styles.caption,{color:colors.gold}]}>Behind the mist</Txt><Pressable testID="why-disclosure" accessibilityRole="button" accessibilityLabel="Back to forecast" accessibilityState={{expanded:true}} aria-expanded onPress={onClose} style={{minHeight:48,justifyContent:'center'}}><Txt style={{color:colors.ice}}>‹ Back to forecast</Txt></Pressable><Txt display style={{fontSize:24,lineHeight:30,marginVertical:8}}>{prediction.headline}</Txt><Txt style={[styles.caption,{color:colors.gold,marginBottom:16}]}>{prediction.label}</Txt>{prediction.astrology?<Txt style={[styles.caption,{color:colors.gold,marginBottom:16}]}>{prediction.astrology}</Txt>:null}{(state.plus?groups:groups.slice(0,1)).map(group=>{const expanded=open.includes(group.id);return <View key={group.id} style={{borderBottomWidth:1,borderColor:'#614C34'}}><Pressable testID={`why-${group.id}`} accessibilityRole="button" accessibilityLabel={group.label} accessibilityState={{expanded}} aria-expanded={expanded} onPress={()=>setOpen(current=>expanded?current.filter(id=>id!==group.id):[...current,group.id])} style={{minHeight:52,paddingVertical:16,flexDirection:'row',alignItems:'center',gap:12}}><Txt style={{flex:1,fontWeight:'600'}}>{group.label}</Txt><Txt aria-hidden style={{color:colors.gold}}>{expanded?'−':'+'}</Txt></Pressable>{expanded?<View style={{paddingBottom:20}}>{group.body}</View>:null}</View>})}{!state.plus?<Action label="Go deeper with Plus" quiet onPress={onUpgrade}/>:null}</>;
}
