import {Image,Pressable,View} from 'react-native';
import {Orb,Txt,colors} from './ui';
import {Paper} from './Paper';
export function TableScene({size,reduce,onPress,question}:{size:number;reduce:boolean;onPress?:()=>void;question?:string}){
 return <View testID="table-scene" style={{alignItems:'center',alignSelf:'stretch',paddingTop:12,paddingBottom:8}}>
  <View testID="room-table" pointerEvents="none" style={{position:'absolute',top:size*.89,left:-24,right:-24,height:size*.48,backgroundColor:'#2b190e',borderRadius:5}}><Image source={require('../assets/apothecary/table.jpg')} style={{width:'100%',height:'100%',opacity:.78}} resizeMode="cover"/></View>
  <View pointerEvents="none" style={{position:'absolute',top:size*.68,left:-9,width:size*.2,height:size*.42,opacity:.78}}><Image source={require('../assets/apothecary/jar.webp')} style={{width:'100%',height:'100%'}} resizeMode="contain"/></View>
  <View style={{zIndex:1}}><Orb size={size} reduce={reduce} onPress={onPress}/></View>
  {question?<Paper testID="scene-question" style={{marginTop:6,paddingVertical:13,paddingHorizontal:24,maxWidth:300,transform:[{rotate:'-1deg'}]}}><Txt style={{fontSize:15,lineHeight:21}}>{question}</Txt></Paper>:null}
 </View>;
}
export function RoomPlaces({onHistory,onCircle,onPlans}:{onHistory:()=>void;onCircle:()=>void;onPlans:()=>void}){
 return <View testID="room-places" style={{flexDirection:'row',justifyContent:'center',gap:12,marginTop:18}}>{[{id:'shelf',label:'History shelf',short:'Shelf',art:require('../assets/apothecary/shelves.webp'),run:onHistory},{id:'hearth',label:'Circles by the hearth',short:'Hearth',art:require('../assets/apothecary/hearth.webp'),run:onCircle},{id:'cabinet',label:'Plans cabinet',short:'Cabinet',art:require('../assets/apothecary/room.webp'),run:onPlans}].map(place=><Pressable key={place.id} testID={`place-${place.id}`} accessibilityRole="button" accessibilityLabel={place.label} onPress={place.run} style={{flex:1,minHeight:74,alignItems:'center',justifyContent:'center'}}><Image accessible={false} source={place.art} style={{width:70,height:80,borderRadius:28,opacity:.85}} resizeMode="cover"/><Txt style={{fontSize:14,lineHeight:20,color:colors.ice,marginTop:3}}>{place.short}</Txt></Pressable>)}</View>;
}
