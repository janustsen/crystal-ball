import {View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Orb,Txt,colors,fonts,styles} from './ui';
import type {Bond} from './types';

// A Bond reading's two glass balls side by side on the desk, the bond's percentage between them and its name below.
export function BondPair({them,bond,reduce}:{them:string;bond:Bond;reduce:boolean}){
 const columns=(left:React.ReactNode,middle:React.ReactNode,right:React.ReactNode)=><View style={{flexDirection:'row',alignItems:'flex-end',justifyContent:'center'}}><View style={{width:104,alignItems:'center'}}>{left}</View><View style={{width:96,alignItems:'center'}}>{middle}</View><View style={{width:104,alignItems:'center'}}>{right}</View></View>;
 return <View testID="bond-pair" accessible accessibilityLabel={`${bond.name}. ${bond.percent}% compatible, you and ${them}.`} style={{alignItems:'center',marginTop:8}}>
  {columns(<Orb size={84} reduce={reduce} phase="reveal"/>,<View style={{alignItems:'center',paddingBottom:28}}><Txt testID="bond-percent" allowFontScaling={false} style={{fontFamily:fonts.display,fontSize:40,lineHeight:46,color:colors.gold}}>{bond.percent}%</Txt><Txt style={styles.label}>Compatible</Txt></View>,<Orb size={84} reduce={reduce} phase="reveal"/>)}
  <LinearGradient pointerEvents="none" start={{x:0,y:0}} end={{x:1,y:0}} colors={['rgba(227,199,143,0)','rgba(227,199,143,.5)','rgba(227,199,143,0)']} style={{width:304,maxWidth:'100%',height:1}}/>
  {columns(<Txt style={[styles.label,{textAlign:'center',marginTop:8}]}>You</Txt>,null,<Txt style={[styles.label,{textAlign:'center',marginTop:8}]}>{them}</Txt>)}
  <Txt testID="bond-name" display style={{fontFamily:fonts.italic,fontSize:28,lineHeight:34,textAlign:'center',marginTop:12}}>{bond.name}</Txt>
 </View>;
}
