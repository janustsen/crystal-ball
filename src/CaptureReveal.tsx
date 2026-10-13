import {useState} from 'react';
import {View,useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Action,Orb,Txt,colors,styles} from './ui';
import {Enter} from './Enter';
import {Atmosphere} from './Atmosphere';
import {GoldenGlow} from './GoldenGlow';

// Only public card fields cross this boundary; a replay never requests a reading.
export function CaptureReveal({headline,golden,dueDate,reduce,onClose}:{headline:string;golden:boolean;dueDate:string;reduce:boolean;onClose:()=>void}){
 const {width,height}=useWindowDimensions(),insets=useSafeAreaInsets(),[replay,setReplay]=useState(0);
 const size=Math.max(180,Math.min(width,390,(height-insets.top-insets.bottom-120)*9/16));
 return <View style={{flex:1,backgroundColor:colors.ink,alignItems:'center',justifyContent:'center',paddingTop:insets.top,paddingBottom:insets.bottom}}>
  <View testID="app-shell" style={{width:size,aspectRatio:9/16,overflow:'hidden'}}><View testID="capture-reveal" style={{flex:1,justifyContent:'center',paddingHorizontal:size*.12,backgroundColor:colors.ink}}>
   <Atmosphere reduce={reduce} mood="reveal"/>
   <Txt allowFontScaling={false} style={[styles.caption,{textAlign:'center',marginBottom:20}]}>Crystal Ball</Txt>
   <View key={replay} style={{alignItems:'center'}}>
    {golden?<GoldenGlow size={size*.5} reduce={reduce}/>:null}
    <Orb size={size*.5} phase="reveal" reduce={reduce}/>
    <Enter kind="reveal" delay={200} reduce={reduce}><Txt allowFontScaling={false} display style={{fontSize:size*.075,lineHeight:size*.09,textAlign:'center',marginTop:12}}>{headline}</Txt></Enter>
   </View>
   {golden?<Txt allowFontScaling={false} style={{fontSize:size*.032,color:colors.gold,textAlign:'center'}}>Golden edition</Txt>:null}
   <Txt allowFontScaling={false} style={{fontSize:size*.036,color:colors.muted,textAlign:'center',marginTop:16}}>Check back {dueDate}</Txt>
  </View></View>
  <View style={{flexDirection:'row',gap:16}}><Action testID="replay-capture" label="Replay" quiet onPress={()=>setReplay(n=>n+1)}/><Action testID="close-capture" label="Done" quiet onPress={onClose}/></View>
 </View>;
}
