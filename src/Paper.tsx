import React,{createContext} from 'react';
import {Platform,Pressable,View,type PressableProps,type ViewProps} from 'react-native';
export const PaperInk=createContext(false);
import {PaperArt} from './PaperArt';
const web=Platform.OS==='web'?{dataSet:{material:'parchment'}}:{};
const base={paddingHorizontal:24,paddingVertical:22,marginTop:12,backgroundColor:'transparent',borderWidth:0} as const;
// Insets belong to the painted frame; caller padding must not place ink on its edge.
const writingInset={backgroundColor:'#dcc79c',paddingTop:18,paddingBottom:18,paddingLeft:24,paddingRight:24};
export function Paper({children,style,...props}:ViewProps){return <View {...props} {...web} style={[base,style,writingInset]}><PaperArt/><PaperInk.Provider value>{children}</PaperInk.Provider></View>}
export function PaperButton({children,style,...props}:PressableProps){return <Pressable {...props} {...web} style={state=>[base,{minHeight:56},typeof style==='function'?style(state):style,writingInset,state.pressed&&{transform:[{translateY:2}]}]}>{state=><><PaperArt/><PaperInk.Provider value>{typeof children==='function'?children(state):children}</PaperInk.Provider></>}</Pressable>}
