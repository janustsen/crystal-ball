import {useState} from 'react';
import {Image,Pressable,View} from 'react-native';
import {Action,Orb,Txt,colors,styles} from './ui';
import {OrbVisual} from './OrbVisual';
import {useStore} from './store';
import {selectedStyle,styleCatalogs} from './delight';
import {ballArt} from './roomAssets';
import type {StyleOf} from './types';
import {Surface} from './Surface';

// The Plus room behind Home: the chamber itself is the room scene's Library spot. Locked, it keeps the door upsell.
// Ball choices preview each style's AI render on its stand (Classic is the live glass ball's own look).
export function InnerLibrary({onUpgrade}:{onUpgrade:()=>void}){
 const {state,chooseStyle,backupBusy:saving}=useStore(),[notice,setNotice]=useState('');
 if(!state.plus)return <View testID="inner-library-locked"><View style={{alignItems:'center'}}><Orb size={96} reduce/></View><Txt style={[styles.muted,{textAlign:'center',marginTop:16}]}>A locked door at the back of the room. Plus opens it.</Txt><Action testID="unlock-inner-library" label="Unlock with Plus" onPress={onUpgrade}/></View>;
 async function choose<K extends keyof StyleOf>(kind:K,value:StyleOf[K]){
  try{await chooseStyle(kind,value);setNotice('')}catch(error){setNotice(error instanceof Error?error.message:'Your style could not be saved. Please try again.')}
 }
 function group<K extends keyof StyleOf>(kind:K,label:string){
  const current=selectedStyle(state,kind);
  return <View style={{marginTop:16}}><Txt style={styles.label}>{label}</Txt><View accessibilityRole="radiogroup" accessibilityLabel={`${kind} style`} style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>{(Object.keys(styleCatalogs[kind]) as StyleOf[K][]).map(value=>{
   const name=(styleCatalogs[kind] as Record<StyleOf[K],{name:string}>)[value].name,checked=current===value;
   return <Pressable key={value} testID={`${kind}-style-${value}`} accessibilityRole="radio" accessibilityLabel={`${kind} style ${name}`} disabled={saving} accessibilityState={{disabled:saving,checked}} aria-checked={checked} onPress={()=>void choose(kind,value)} style={{minHeight:44,width:kind==='ball'?60:undefined,padding:kind==='ball'?4:12,alignItems:'center'}}>
    <Surface kind="chip" state={saving?'disabled':checked?'selected':undefined}>
    {kind==='ball'?<View style={{width:48,height:64,alignItems:'center',justifyContent:'center',borderRadius:8,overflow:'hidden'}}>{value==='classic'?<OrbVisual size={44} reduce/>:<Image source={ballArt[value as Exclude<StyleOf['ball'],'classic'>].preview} style={{width:48,height:64}}/>}</View>:null}
    <Txt style={kind==='ball'?[styles.caption,{marginTop:4,textAlign:'center'}]:undefined}>{name}</Txt>
   </Surface></Pressable>})}</View></View>;
 }
 return <View testID="inner-library-open"><Txt style={styles.muted}>Choose how your ball and share card look.</Txt>{group('ball','Ball')}{group('card','Share card')}{notice?<View style={styles.panel}><Surface kind="card"><Txt accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:12}]}>{notice}</Txt></Surface></View>:null}</View>;
}
