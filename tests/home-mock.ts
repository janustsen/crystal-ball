// Shallow-render stand-in for src/Home: exposes Home's controls under the testIDs the real components use.
// The harness's createElement expands function components, so these render inline in app/index.tsx's tree.
export function homeMock(react:{createElement:(type:any,props:any,...children:any[])=>any}){
 const h=react.createElement;
 return {
  Home:({ready,onAsk,insight,sky,next}:any)=>h('Home',{},h('Pressable',{testID:'tap-to-ask',disabled:!ready,onPress:onAsk}),insight,sky,next),
  NextCard:({label,title,text,action,onAction}:any)=>h('NextCard',{label,title,text},action?h('Pressable',{testID:'next-step-action',onPress:onAction},h('Txt',{},action)):null),
  SkyLink:({dot,onPress}:any)=>h('Pressable',{testID:'open-sky',dot,onPress}),
  tabs:['Home','History','You'],
  RoomHeader:({title,count,ready,onPlans,onBack}:any)=>h('RoomHeader',{},onBack?h('Pressable',{testID:'header-back',onPress:onBack}):null,h('Txt',{},title),h('Pressable',{testID:'view-plans',disabled:!ready,onPress:onPlans},h('Txt',{},count))),
  PlansPill:({count,ready,onPress}:any)=>h('Pressable',{testID:'view-plans',disabled:!ready,onPress},h('Txt',{},count)),
  tabBarSpace:(bottom:number)=>bottom+94,
  headerBottom:(top:number)=>Math.max(52,top+6)+44,
  BallButton:({home,onPress}:any)=>h('Pressable',{testID:home?'hero-orb':'ask-ball',onPress}),
  Shift:({offset,children}:any)=>h('Shift',{offset},children),
  HomeTabBar:({shown,dots,current,disabled,onTab}:any)=>h('HomeTabBar',{},...shown.map((t:string)=>h('Pressable',{testID:`tab-${t.toLowerCase()}`,disabled,dot:!!dots[t],accessibilityState:{selected:t===current},onPress:()=>onTab(t)}))),
 };
}
// Stand-in for src/AskBall: the ball's question field plus the chip and controls the app passes in, under the same testIDs.
export function askBallMock(react:{createElement:(type:any,props:any,...children:any[])=>any}){
 const h=react.createElement;
 return {
  useKeyboardInset:()=>0,
  AskBall:({testID,value,onChangeText,chip,note,controls}:any)=>h('AskBall',{},h('TextInput',{testID,value,onChangeText}),chip,note,controls),
  RoomCamera:({children}:any)=>h('RoomCamera',{},children),
  AskMoment:()=>null,
 };
}
