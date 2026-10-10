import {useState} from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import Svg,{Circle,Defs,Mask,Rect} from 'react-native-svg';
import {Enter} from './Enter';
import {Surface} from './Surface';
import {Action,Txt,colors,styles} from './ui';
import {barInset,headerBottom,homeTabBarHeight,tabs,type Tab} from './Home';

const steps:{tab:Tab;title:string;text:string}[]=[
 {tab:'Ask',title:'Ask the Ball',text:'Tap here, or the ball on the desk, and ask what’s ahead.'},
 {tab:'Sky',title:'Sky',text:'Tonight’s questions from everyone, shared anonymously. Add your own star, or make a private Circle with friends.'},
 {tab:'History',title:'History',text:'Every forecast gets a due date. Come back and say if it came true.'},
 {tab:'You',title:'You',text:'Your birthday, what the Ball remembers, and your plan.'},
];

// A first-run tour: the screen dims around one tab at a time while a card at the top says what it is. The dim layer lets
// every touch through, so pressing any tab or the ball simply carries on (and ends the tour).
export function Tour({width,height,top,bottom,reduce,onDone}:{width:number;height:number;top:number;bottom:number;reduce:boolean;onDone:()=>void}){
 const [index,setIndex]=useState(0),step=steps[index],last=index===steps.length-1;
 const slot=(width-28)/tabs.length,x=14+slot*(tabs.indexOf(step.tab)+.5);
 const y=height-bottom-barInset-homeTabBarHeight/2-(step.tab==='Ask'?13:0),r=step.tab==='Ask'?40:34;
 return <View pointerEvents="box-none" style={{position:'absolute',left:0,top:0,width,height}}>
  <Svg pointerEvents="none" width={width} height={height} style={{position:'absolute',left:0,top:0}}>
   <Defs><Mask id="tour-hole"><Rect width={width} height={height} fill="#fff"/><Circle cx={x} cy={y} r={r} fill="#000"/></Mask></Defs>
   <Rect width={width} height={height} fill="rgba(10,7,5,.72)" mask="url(#tour-hole)"/>
   <Circle cx={x} cy={y} r={r} fill="none" stroke={colors.gold} strokeWidth={1.5} strokeOpacity={.8}/>
  </Svg>
  <View testID="tour" style={{position:'absolute',left:20,right:20,top:headerBottom(top)+12}}>
   <Enter key={index} kind="toast" reduce={reduce}><View style={{maxHeight:height-headerBottom(top)-12-bottom-barInset-homeTabBarHeight-24,overflow:'hidden',borderRadius:22}}><Surface kind="card"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{padding:20}}>
    <Txt style={styles.label}>{index+1} of {steps.length}</Txt>
    <Txt display accessibilityLiveRegion="polite" style={{fontSize:26,lineHeight:30,marginTop:6}}>{step.title}</Txt>
    <Txt style={{marginTop:6}}>{step.text}</Txt>
    <Action testID="tour-next" label={last?'Got it':'Next'} onPress={()=>last?onDone():setIndex(index+1)}/>
    {last?null:<Pressable testID="tour-skip" accessibilityRole="button" onPress={onDone} style={{minHeight:44,justifyContent:'center'}}><Txt style={[styles.caption,{textAlign:'center'}]}>Skip tour</Txt></Pressable>}
   </ScrollView></Surface></View></Enter>
  </View>
 </View>;
}
