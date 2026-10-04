import React,{createContext} from 'react';
import {Image,Platform,Pressable,StyleSheet,View,type PressableProps,type ViewProps} from 'react-native';
export const PaperInk=createContext(false);
import {PaperArt} from './PaperArt';
const web=Platform.OS==='web'?{dataSet:{material:'parchment'}}:{};
const base={paddingHorizontal:24,paddingVertical:22,marginTop:12,backgroundColor:'transparent',borderWidth:0} as const;
// Insets belong to the painted frame; caller padding must not place ink on its edge.
const writingInset={backgroundColor:'#dcc79c',paddingTop:18,paddingBottom:18,paddingLeft:24,paddingRight:24};
export function Paper({children,style,...props}:ViewProps){return <View {...props} {...web} style={[base,style,writingInset]}><PaperArt/><PaperInk.Provider value>{children}</PaperInk.Provider></View>}
export function PaperButton({children,style,wood=false,...props}:PressableProps&{wood?:boolean}){return <Pressable {...props} {...(Platform.OS==='web'?{dataSet:{material:wood?'wood':'parchment'}}:{})} style={state=>[base,{minHeight:56},typeof style==='function'?style(state):style,writingInset,wood&&{backgroundColor:'#302014',boxShadow:'inset 0 2px 1px #98704c55, inset 0 -5px 2px #130904, 0 6px 9px #09040088'},state.pressed&&{transform:[{translateY:2}]}]}>{state=><>{wood?<View pointerEvents="none" accessible={false} aria-hidden style={[StyleSheet.absoluteFill,{overflow:'hidden'}]}><Image source={require('../assets/apothecary/table.jpg')} style={{width:'100%',height:'100%',opacity:.16}} resizeMode="cover"/></View>:<PaperArt/>}<PaperInk.Provider value={!wood}>{typeof children==='function'?children(state):children}</PaperInk.Provider></>}</Pressable>}
