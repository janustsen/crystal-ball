import {View} from 'react-native';
import {Enter} from './Enter';
import {colors} from './ui';
export function GoldenGlow({reduce,size}:{reduce:boolean;size:number}){
 return <View pointerEvents="none" style={{position:'absolute',width:size*1.06,top:-size*.03}}><Enter kind="reveal" reduce={reduce}><View testID="golden-glow" style={{width:size*1.06,height:size*1.06,borderRadius:size,borderWidth:2,borderColor:colors.gold,backgroundColor:'#E0A45822'}}/></Enter></View>;
}
