import {Pressable,View} from 'react-native';
import {Action,Orb,Txt,colors,styles} from './ui';
import {useStore} from './store';
import {selectedStyle} from './delight';
import type {StyleName} from './types';
const choices:StyleName[]=['classic','gold','obsidian'];
export function DelightStyles({onUpgrade}:{onUpgrade:()=>void}){
 const {state,update}=useStore();
 if(!state.plus)return <Action label="Ball & card styles · Plus" quiet onPress={onUpgrade}/>;
 return <View style={{marginTop:28}}><Txt display style={styles.title}>Your style</Txt><View style={{alignItems:'center'}}><Orb size={96} reduce/></View>{(['ball','card'] as const).map(kind=><View key={kind} style={{marginTop:16}}><Txt style={styles.caption}>{kind==='ball'?'Ball':'Share card'}</Txt><View accessibilityRole="radiogroup" accessibilityLabel={`${kind} style`} style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8}}>{choices.map(value=><Pressable key={value} testID={`${kind}-style-${value}`} accessibilityRole="radio" accessibilityLabel={`${kind} style ${value}`} accessibilityState={{checked:selectedStyle(state,kind)===value}} aria-checked={selectedStyle(state,kind)===value} onPress={()=>update(s=>({...s,[kind==='ball'?'ballStyle':'cardStyle']:value}))} style={{minHeight:44,padding:12,borderRadius:12,borderWidth:1,borderColor:selectedStyle(state,kind)===value?colors.gold:colors.muted}}><Txt>{value[0].toUpperCase()+value.slice(1)}</Txt></Pressable>)}</View></View>)}</View>;
}
