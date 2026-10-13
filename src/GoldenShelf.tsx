import {Pressable,ScrollView,View} from 'react-native';
import {Action,CardHeader,Txt,styles} from './ui';
import {goldenShelf} from './story-card';
import type {Prediction} from './types';
import {Surface} from './Surface';

// Functional shelf on the existing panel look. The designed golden shelf replaces this body; keep the testIDs.
export function GoldenShelf({history,onOpen,onShare}:{history:Prediction[];onOpen:(p:Prediction)=>void;onShare:()=>void}){
 const shelf=goldenShelf(history);
 if(!shelf.length)return null;
 return <View testID="golden-shelf" style={styles.panel}><Surface kind="card">
  <CardHeader title={`Golden shelf · ${shelf.length}`} label="Rare"/>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:16,paddingVertical:12}}>
   {shelf.map(p=><Pressable testID={`golden-shelf-item-${p.id}`} key={p.id} accessibilityRole="button" accessibilityLabel={`Golden forecast: ${p.headline}`} onPress={()=>onOpen(p)} style={{width:200,minHeight:44}}>
    <Txt numberOfLines={4} style={styles.strong}>{p.headline}</Txt>
    <Txt style={styles.caption}>{new Date(p.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</Txt>
   </Pressable>)}
  </ScrollView>
  <Action testID="share-golden-set" label="Share your golden set" quiet onPress={onShare}/>
 </Surface></View>;
}
