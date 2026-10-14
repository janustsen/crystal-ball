import {Pressable,ScrollView,View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {CardHeader,Txt,colors,styles} from './ui';
import {Surface} from './Surface';
import {checkInLabel,localDay,suggestedCheckIn} from './retention';
import type {Prediction} from './types';

// A gold wax seal pressed with a small heart.
export const loveSeal='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path fill="#E3C78F" d="M20 2l3.2 3 4.3-.9 1.6 4.1 4.2 1.4-.4 4.4 3.1 3.1-2.2 3.8 1.3 4.2-3.8 2.2-.6 4.4-4.4.4-2.2 3.8-4.1-1.6L20 38l-3.1-3.1-4.1 1.6-2.2-3.8-4.4-.4-.6-4.4-3.8-2.2 1.3-4.2L.9 17.7 4 14.6l-.4-4.4 4.2-1.4 1.6-4.1 4.3.9z"/><circle cx="20" cy="20" r="12.5" fill="none" stroke="#20160F" stroke-opacity=".35" stroke-width="1"/><path fill="#20160F" fill-opacity=".72" d="M20 27.5s-7-4.3-7-9.2c0-2.3 1.8-4 3.9-4 1.4 0 2.5.7 3.1 1.8.6-1.1 1.7-1.8 3.1-1.8 2.1 0 3.9 1.7 3.9 4 0 4.9-7 9.2-7 9.2z"/></svg>';
const date=(day:string)=>new Date(`${day}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});

// Love timing readings sit on their own shelf as gold-sealed cards, each showing the date the Ball named.
export function LoveShelf({history,onOpen}:{history:Prediction[];onOpen:(p:Prediction)=>void}){
 const shelf=history.filter(p=>p.timing==='love');
 if(!shelf.length)return null;
 const today=localDay();
 return <View testID="love-shelf" style={styles.panel}><Surface kind="card"><CardHeader title="Love timing" label="Sealed"/>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12,paddingVertical:12}}>
   {shelf.map(p=>{const day=suggestedCheckIn(p),status=p.outcome?checkInLabel(p,today):day===today?'Opens today · did it happen?':day<today?'Ready to check in · did it happen?':'Sealed until then';
    return <Pressable testID={`love-shelf-item-${p.id}`} key={p.id} accessibilityRole="button" accessibilityLabel={`Love timing for ${date(day)}: ${p.headline} ${status}`} onPress={()=>onOpen(p)} style={{width:212,minHeight:44,padding:16}}>
     <Surface kind="card" state="selected"/>
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}><SvgXml aria-hidden xml={loveSeal} width={32} height={32}/><View style={{flexShrink:1}}><Txt style={styles.caption}>When it happens</Txt><Txt display style={{fontSize:22,lineHeight:26,color:colors.gold}}>{date(day)}</Txt></View></View>
     <Txt numberOfLines={3} style={[styles.caption,{marginTop:10,color:colors.ivory}]}>{p.headline}</Txt>
     <Txt style={[styles.meta,{marginTop:8}]}>{status}</Txt>
    </Pressable>})}
  </ScrollView>
 </Surface></View>;
}
