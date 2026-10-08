import React,{createContext} from 'react';
import {Platform,View,type ViewStyle} from 'react-native';

// The UI's surfaces: dark glass over the room, hairline gold borders, and gold only where something is chosen or primary.
// Put a Surface first inside the surface's own view (which keeps its layout, padding, accessibility and testID) and the
// content inside it; text on a gold surface takes the dark ink.
export type SurfaceKind='card'|'error'|'row'|'chip'|'pill'|'primary'|'input'|'mic';
export type SurfaceState='selected'|'pressed'|'disabled'|'focused'|'listening';
export const SurfaceInk=createContext<string|undefined>(undefined);
export const onGold='#20160F';
const line='rgba(227,199,143,.22)',field='rgba(255,240,210,.05)',gold='#E3C78F';
const glass:ViewStyle=Platform.OS==='web'?{backdropFilter:'blur(18px) saturate(1.2)'} as ViewStyle:{};
const looks:Record<SurfaceKind,ViewStyle>={
 card:{...glass,borderRadius:22,borderWidth:1,borderColor:line,backgroundColor:'rgba(22,15,11,.62)'},
 error:{...glass,borderRadius:22,borderWidth:1,borderColor:'rgba(232,150,120,.5)',backgroundColor:'rgba(34,14,10,.7)'},
 row:{borderRadius:14,borderWidth:1,borderColor:'rgba(227,199,143,.3)',backgroundColor:field},
 chip:{borderRadius:999,borderWidth:1,borderColor:'rgba(227,199,143,.3)',backgroundColor:field},
 pill:{...glass,borderRadius:999,borderWidth:1,borderColor:'rgba(227,199,143,.28)',backgroundColor:'rgba(22,15,11,.55)'},
 primary:{borderRadius:999,backgroundColor:gold},
 input:{borderRadius:14,borderWidth:1,borderColor:'rgba(227,199,143,.3)',backgroundColor:field},
 mic:{...glass,borderRadius:999,borderWidth:1,borderColor:'rgba(227,199,143,.4)',backgroundColor:'rgba(22,15,11,.6)'},
};
const states:Partial<Record<SurfaceState,ViewStyle>>={
 selected:{backgroundColor:gold,borderColor:gold},
 pressed:{opacity:.82},
 disabled:{opacity:.45},
 focused:{borderColor:gold},
 listening:{borderColor:gold,backgroundColor:'rgba(227,199,143,.2)'},
};
// A selected card keeps its glass and takes a gold outline; a selected chip or row fills gold.
const look=(kind:SurfaceKind,state?:SurfaceState)=>state==='selected'&&(kind==='card'||kind==='error')?[looks[kind],{borderColor:gold,borderWidth:1.5}]:[looks[kind],state&&states[state]];
const filled=(kind:SurfaceKind,state?:SurfaceState)=>kind==='primary'||state==='selected'&&kind!=='card'&&kind!=='error';

export function Surface({kind,state,children}:React.PropsWithChildren<{kind:SurfaceKind;state?:SurfaceState}>){
 return <>
  <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden testID={`surface-${kind}`} style={[{position:'absolute',left:0,top:0,right:0,bottom:0},...look(kind,state)]}/>
  {children===undefined?null:<SurfaceInk.Provider value={filled(kind,state)?onGold:undefined}>{children}</SurfaceInk.Provider>}
 </>;
}
