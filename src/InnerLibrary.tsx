import {useState} from 'react';
import {Pressable,View} from 'react-native';
import {Action,Orb,Txt,colors,styles} from './ui';
import {useStore} from './store';
import {selectedStyle,styleCatalog} from './delight';
import {saveStyles,serverMetered} from './api';
import type {StyleName} from './types';
const choices=Object.keys(styleCatalog) as StyleName[];

// The Plus room behind Home. Placeholder views on the current look: the designed room and style art replace them,
// keeping these testIDs (inner-library-locked, inner-library-open, <kind>-style-<id>).
export function InnerLibrary({onUpgrade}:{onUpgrade:()=>void}){
 const {state,update,applyBalance}=useStore(),[notice,setNotice]=useState('');
 if(!state.plus)return <View testID="inner-library-locked"><View style={{alignItems:'center'}}><Orb size={96} reduce/></View><Txt style={[styles.muted,{textAlign:'center',marginTop:16}]}>A locked door at the back of the room. Plus opens it.</Txt><Action testID="unlock-inner-library" label="Unlock with Plus" onPress={onUpgrade}/></View>;
 async function choose(kind:'ball'|'card',value:StyleName){
  const next={ballStyle:selectedStyle(state,'ball'),cardStyle:selectedStyle(state,'card'),[kind==='ball'?'ballStyle':'cardStyle']:value};
  // Without Supabase the loopback preview keeps styles on this device.
  if(!serverMetered){update(s=>({...s,...next}));return}
  try{await applyBalance(await saveStyles(next.ballStyle,next.cardStyle));setNotice('')}catch(error){setNotice(error instanceof Error?error.message:'Your style could not be saved. Please try again.')}
 }
 return <View testID="inner-library-open"><Txt style={styles.muted}>Choose how your ball and share card look.</Txt><View style={{alignItems:'center',marginTop:16}}><Orb size={96} reduce/></View>{(['ball','card'] as const).map(kind=><View key={kind} style={{marginTop:16}}><Txt style={styles.caption}>{kind==='ball'?'Ball':'Share card'}</Txt><View accessibilityRole="radiogroup" accessibilityLabel={`${kind} style`} style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>{choices.map(value=><Pressable key={value} testID={`${kind}-style-${value}`} accessibilityRole="radio" accessibilityLabel={`${kind} style ${styleCatalog[value].name}`} accessibilityState={{checked:selectedStyle(state,kind)===value}} aria-checked={selectedStyle(state,kind)===value} onPress={()=>void choose(kind,value)} style={{minHeight:44,padding:12,borderRadius:12,borderWidth:1,borderColor:selectedStyle(state,kind)===value?colors.gold:colors.muted}}><Txt>{styleCatalog[value].name}</Txt></Pressable>)}</View></View>)}{notice?<Txt accessibilityLiveRegion="polite" style={[styles.caption,{marginTop:12}]}>{notice}</Txt>:null}</View>;
}
