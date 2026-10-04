import React,{createContext} from 'react';
import {Image,Platform,Pressable,StyleSheet,View,type PressableProps,type ViewProps} from 'react-native';
import {PaperArt} from './PaperArt';
export const PaperInk=createContext(false);
const web=Platform.OS==='web'?{dataSet:{material:'parchment'}}:{};
const base={paddingHorizontal:24,paddingVertical:22,marginTop:12,backgroundColor:'transparent',borderWidth:0} as const;
// The painted layer owns its cut edge. Keeping the control uncut lets its shadow fall outside it.
const writingInset={backgroundColor:'transparent',paddingTop:18,paddingBottom:18,paddingLeft:24,paddingRight:24};
export function Paper({children,style,...props}:ViewProps){return <View {...props} {...web} style={[base,style,writingInset]}><PaperArt/><PaperInk.Provider value>{children}</PaperInk.Provider></View>}
export function PaperButton({children,style,wood=false,quiet=false,...props}:PressableProps&{wood?:boolean;quiet?:boolean}){
 return <Pressable {...props} {...(Platform.OS==='web'?{dataSet:{material:wood?'wood':'parchment'}}:{})} style={state=>[base,{minHeight:56},typeof style==='function'?style(state):style,writingInset,wood&&{paddingBottom:24},wood&&quiet&&{paddingTop:12,paddingBottom:14},state.pressed&&{transform:[{translateY:2}],opacity:.82}]}>{state=><>
  {wood?<View pointerEvents="none" accessible={false} aria-hidden style={[StyleSheet.absoluteFill,{overflow:'hidden',backgroundColor:quiet?'#261a12':'#382517',boxShadow:state.pressed?'inset 0 4px 7px #080301cc, inset 0 -2px 1px #120904':quiet?'inset 0 1px 2px #a7794344, inset 0 -3px 2px #100704':'inset 0 3px 2px #b48a5a88, inset 3px 0 5px #a06a3333, inset 0 -9px 2px #120904, inset -3px 0 5px #09040088'}]}><Image source={require('../assets/apothecary/table.jpg')} style={{width:'100%',height:'100%',opacity:quiet?.12:.3}} resizeMode="cover"/></View>:<PaperArt/>}
  <PaperInk.Provider value={!wood}>{typeof children==='function'?children(state):children}</PaperInk.Provider>
 </>}</Pressable>;
}
